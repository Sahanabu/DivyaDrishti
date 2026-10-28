import cv2
import time
import math
from ultralytics import YOLO

class ObjectDetector:
    def __init__(self):
        self.model = YOLO("yolov8n.pt")
        # COCO mapping for relevant vehicle/person classes
        self.relevant_classes = {
            0: "person",
            1: "bicycle",
            2: "car",
            3: "motorcycle",
            5: "bus",
            7: "truck"
        }
        # Approximate real-world widths in meters for distance estimation
        self.real_widths = {
            "person": 0.5,
            "bicycle": 0.6,
            "car": 1.8,
            "motorcycle": 0.8,
            "bus": 2.5,
            "truck": 2.5
        }
        # Assumed focal length in pixels (standard webcam proxy)
        self.focal_length = 700
        self.prev_closest_dist = None
        self.prev_time = None
        self.smoothed_ttc = float('inf')
        
    def process(self, frame, output_frame=None):
        results = self.model(frame, verbose=False)
        
        draw_frame = output_frame if output_frame is not None else frame.copy()
        draw_frame = results[0].plot(img=draw_frame)
        
        obj_features = {
            "object_count": 0,
            "person_count": 0,
            "car_count": 0,
            "motorcycle_count": 0,
            "truck_count": 0,
            "bus_count": 0,
            "closest_object": "none",
            "min_distance_m": float('inf'),
            "time_to_collision": float('inf'),
            "forward_collision_warning": False,
            "largest_bbox_area": 0.0,
            "average_confidence": 0.0
        }
        
        boxes = results[0].boxes
        now = time.time()
        min_distance = float('inf')
        closest_obj_name = "none"

        if len(boxes) > 0:
            total_conf = 0
            
            for box in boxes:
                cls_id = int(box.cls[0].item())
                conf = box.conf[0].item()
                
                # Check if it's a relevant class for safety
                if cls_id in self.relevant_classes:
                    obj_features["object_count"] += 1
                    class_name = self.relevant_classes[cls_id]
                    
                    if class_name == "person": obj_features["person_count"] += 1
                    elif class_name == "car": obj_features["car_count"] += 1
                    elif class_name == "motorcycle": obj_features["motorcycle_count"] += 1
                    elif class_name == "truck": obj_features["truck_count"] += 1
                    elif class_name == "bus": obj_features["bus_count"] += 1
                    
                    total_conf += conf
                    
                    # Extract dimensions
                    x, y, w, h = box.xywh[0].tolist()
                    area = w * h
                    
                    # Estimate distance in meters using pinhole camera model
                    real_w = self.real_widths.get(class_name, 1.0)
                    distance_m = (real_w * self.focal_length) / w if w > 0 else 0
                    
                    # Draw live distance on the frame
                    xmin, ymin, xmax, ymax = box.xyxy[0].tolist()
                    label = f"{distance_m:.1f}m"
                    
                    (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
                    cv2.rectangle(draw_frame, (int(xmin), int(ymax) - th - 10), 
                                  (int(xmin) + tw, int(ymax)), (0, 0, 0), -1)
                    cv2.putText(draw_frame, label, (int(xmin), int(ymax) - 5),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
                    
                    if area > obj_features["largest_bbox_area"]:
                        obj_features["largest_bbox_area"] = round(area, 2)
                        
                    if distance_m < min_distance and distance_m > 0:
                        min_distance = distance_m
                        closest_obj_name = class_name
                        
            if obj_features["object_count"] > 0:
                obj_features["average_confidence"] = round(total_conf / obj_features["object_count"], 2)
                obj_features["closest_object"] = closest_obj_name
                obj_features["min_distance_m"] = round(min_distance, 1)

                # Compute Time-To-Collision (TTC)
                if self.prev_closest_dist is not None and self.prev_time is not None:
                    dt = max(0.02, now - self.prev_time)
                    approach_speed = (self.prev_closest_dist - min_distance) / dt # in m/s
                    if approach_speed > 1.0 and min_distance > 0:
                        ttc = min_distance / approach_speed
                        if math.isfinite(self.smoothed_ttc):
                            self.smoothed_ttc = 0.6 * self.smoothed_ttc + 0.4 * ttc
                        else:
                            self.smoothed_ttc = ttc
                    else:
                        self.smoothed_ttc = float('inf')
                
                self.prev_closest_dist = min_distance
                self.prev_time = now

                if math.isfinite(self.smoothed_ttc):
                    obj_features["time_to_collision"] = round(self.smoothed_ttc, 1)

                # Forward Collision Warning trigger condition
                if (min_distance < 15.0 and self.smoothed_ttc < 2.5) or (min_distance < 4.0):
                    obj_features["forward_collision_warning"] = True
                    # Draw high-visibility FCW banner on frame
                    fh, fw = draw_frame.shape[:2]
                    cv2.rectangle(draw_frame, (fw // 2 - 190, 15), (fw // 2 + 190, 60), (0, 0, 200), -1)
                    cv2.rectangle(draw_frame, (fw // 2 - 190, 15), (fw // 2 + 190, 60), (0, 255, 255), 2)
                    fcw_text = f"COLLISION WARNING: {min_distance:.1f}m (TTC: {self.smoothed_ttc:.1f}s)" if math.isfinite(self.smoothed_ttc) else f"PROXIMITY WARNING: {min_distance:.1f}m"
                    cv2.putText(draw_frame, fcw_text, (fw // 2 - 180, 45), cv2.FONT_HERSHEY_DUPLEX, 0.52, (255, 255, 255), 2)
        else:
            self.prev_closest_dist = None
            self.smoothed_ttc = float('inf')

        if output_frame is not None:
            output_frame[:] = draw_frame
            
        return draw_frame, obj_features
