import cv2
import numpy as np

class LaneDetector:
    def __init__(self):
        self.left_fit = None
        self.right_fit = None
        self.consecutive_misses = 0

    def process(self, frame, output_frame=None):
        height, width = frame.shape[:2]
        
        lane_features = {
            "lane_detected": False,
            "lane_deviation": 0.0,
            "lane_departure": False
        }
        
        # 1. High-Precision Edge Detection (Color + Gradient)
        # Convert to HLS space to isolate white and yellow lanes better
        hls = cv2.cvtColor(frame, cv2.COLOR_BGR2HLS)
        s_channel = hls[:, :, 2]
        
        # S-channel threshold (picks up yellow and strong white lines)
        s_binary = np.zeros_like(s_channel)
        s_binary[(s_channel >= 150) & (s_channel <= 255)] = 255
        
        # Sobel X (detects vertical-ish lines, ignores horizontal noise like shadows)
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        sobelx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
        abs_sobelx = np.absolute(sobelx)
        scaled_sobel = np.uint8(255 * abs_sobelx / (np.max(abs_sobelx) + 1e-5))
        
        sxbinary = np.zeros_like(scaled_sobel)
        sxbinary[(scaled_sobel >= 30) & (scaled_sobel <= 255)] = 255
        
        # Combine S-channel and Sobel-X
        edges = cv2.bitwise_or(s_binary, sxbinary)
        
        # 2. Aggressive ROI (Chop off left 15% and right 5% to mask out the physical monitor bezel!)
        mask = np.zeros_like(edges)
        horizon_y = int(height * 0.55)
        polygon = np.array([[
            (int(width * 0.15), height),
            (int(width * 0.40), horizon_y),
            (int(width * 0.60), horizon_y),
            (int(width * 0.95), height)
        ]], np.int32)
        cv2.fillPoly(mask, polygon, 255)
        masked_edges = cv2.bitwise_and(edges, mask)
        
        # 3. Extract pixels
        nonzero = masked_edges.nonzero()
        nonzeroy = np.array(nonzero[0])
        nonzerox = np.array(nonzero[1])
        
        if len(nonzerox) == 0:
            self.consecutive_misses += 1
            if self.consecutive_misses > 5:
                self.left_fit = None
                self.right_fit = None
            return lane_features
            
        # 4. Targeted Search (Margin Search) vs Histogram Peak Search
        if self.left_fit is not None and self.right_fit is not None:
            # High-precision: search only within a +/- 60 pixel margin of the previous known lane lines
            margin = 60
            left_fitx = self.left_fit[0]*(nonzeroy**2) + self.left_fit[1]*nonzeroy + self.left_fit[2]
            right_fitx = self.right_fit[0]*(nonzeroy**2) + self.right_fit[1]*nonzeroy + self.right_fit[2]
            
            left_lane_inds = ((nonzerox > (left_fitx - margin)) & (nonzerox < (left_fitx + margin)))
            right_lane_inds = ((nonzerox > (right_fitx - margin)) & (nonzerox < (right_fitx + margin)))
        else:
            # High-precision fallback: Histogram Peak Search
            # Look at the bottom half of the masked edges to find where lines are most dense
            histogram = np.sum(masked_edges[horizon_y:, :], axis=0)
            midpt = int(histogram.shape[0] / 2)
            
            leftx_base = np.argmax(histogram[:midpt])
            rightx_base = np.argmax(histogram[midpt:]) + midpt
            
            # Search within a generous margin of the detected peaks
            margin = 120
            left_lane_inds = ((nonzerox > (leftx_base - margin)) & (nonzerox < (leftx_base + margin)))
            right_lane_inds = ((nonzerox > (rightx_base - margin)) & (nonzerox < (rightx_base + margin)))
        
        leftx = nonzerox[left_lane_inds]
        lefty = nonzeroy[left_lane_inds]
        rightx = nonzerox[right_lane_inds]
        righty = nonzeroy[right_lane_inds]
        
        # 5. Polynomial Curve Fitting with Exponential Moving Average (EMA) for buttery smooth lines
        alpha = 0.2
        valid_fit = False
        if len(leftx) > 30 and len(rightx) > 30:
            try:
                new_left_fit = np.polyfit(lefty, leftx, 2)
                new_right_fit = np.polyfit(righty, rightx, 2)
                
                # Sanity Check for valid road lanes
                ploty = np.linspace(horizon_y, height - 1, height - horizon_y)
                new_left_fitx = new_left_fit[0]*ploty**2 + new_left_fit[1]*ploty + new_left_fit[2]
                new_right_fitx = new_right_fit[0]*ploty**2 + new_right_fit[1]*ploty + new_right_fit[2]
                
                width_top = new_right_fitx[0] - new_left_fitx[0]
                width_bottom = new_right_fitx[-1] - new_left_fitx[-1]
                
                # 1. Right line must be to the right of left line
                # 2. Lane should be wider at the bottom (perspective)
                # 3. Lane should have a minimum width at the bottom to avoid collapsing
                if width_bottom > 100 and width_bottom > width_top and np.all(new_right_fitx > new_left_fitx):
                    valid_fit = True
                    self.consecutive_misses = 0
                    if self.left_fit is None:
                        self.left_fit = new_left_fit
                        self.right_fit = new_right_fit
                    else:
                        self.left_fit = alpha * new_left_fit + (1 - alpha) * self.left_fit
                        self.right_fit = alpha * new_right_fit + (1 - alpha) * self.right_fit
                        
                    lane_features["lane_detected"] = True
            except np.linalg.LinAlgError:
                pass
                
        if not valid_fit:
            self.consecutive_misses += 1
            if self.consecutive_misses > 5:
                self.left_fit = None
                self.right_fit = None
                
        # 6. Rendering and Feature Extraction
        if self.left_fit is not None and self.right_fit is not None:
            ploty = np.linspace(horizon_y, height - 1, height - horizon_y)
            
            left_fitx = self.left_fit[0]*ploty**2 + self.left_fit[1]*ploty + self.left_fit[2]
            right_fitx = self.right_fit[0]*ploty**2 + self.right_fit[1]*ploty + self.right_fit[2]
            
            # Lane Deviation Math (at the bottom of the screen)
            lane_center = (left_fitx[-1] + right_fitx[-1]) / 2
            car_center = width / 2
            deviation_pixels = car_center - lane_center
            
            # Approximate conversion (assume lane is ~800 pixels wide at the bottom)
            xm_per_pix = 3.7 / 800.0
            lane_features["lane_deviation"] = round(deviation_pixels * xm_per_pix, 2)
            
            # Only trigger lane departure alert for RIGHT lane deviation (> 0.4m)
            if lane_features["lane_deviation"] > 0.4:
                lane_features["lane_departure"] = True
            else:
                lane_features["lane_departure"] = False
                
            # Draw the Augmented Reality Overlay
            if output_frame is not None:
                overlay = np.zeros_like(output_frame)
                
                # Format points for cv2.fillPoly
                pts_left = np.array([np.transpose(np.vstack([left_fitx, ploty]))])
                pts_right = np.array([np.flipud(np.transpose(np.vstack([right_fitx, ploty])))])
                pts = np.hstack((pts_left, pts_right))
                
                # Draw the lane polygon (Green Fill)
                cv2.fillPoly(overlay, np.int_([pts]), (0, 255, 0))
                
                # Draw thick curved lane boundaries (Left Blue, Right Red only on right departure alert)
                right_color = (0, 0, 255) if lane_features["lane_departure"] else (255, 180, 0)
                cv2.polylines(overlay, np.int_([pts_left]), isClosed=False, color=(255, 180, 0), thickness=12)
                cv2.polylines(overlay, np.int_([pts_right]), isClosed=False, color=right_color, thickness=16 if lane_features["lane_departure"] else 12)
                
                # Combine the overlay with the real camera frame
                cv2.addWeighted(output_frame, 1, overlay, 0.4, 0, output_frame)
                
        return lane_features
