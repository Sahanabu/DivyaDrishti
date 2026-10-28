import cv2
import numpy as np
import time
import mediapipe as mp

class DrowsinessDetector:

    def __init__(self, model_path="face_landmarker.task"):

        self.base_options = mp.tasks.BaseOptions(
            model_asset_path=model_path
        )

        self.options = mp.tasks.vision.FaceLandmarkerOptions(
            base_options=self.base_options,
            running_mode=mp.tasks.vision.RunningMode.VIDEO,
            num_faces=1,
            output_face_blendshapes=True,
            min_face_detection_confidence=0.5,
            min_face_presence_confidence=0.5,
            min_tracking_confidence=0.5
        )

        self.landmarker = mp.tasks.vision.FaceLandmarker.create_from_options(
            self.options
        )

        self.start_time = time.time()

        self.eye_closed_start = None
        self.eye_open_start = None
        self.blink_count = 0
        self.distracted_start = None

        # 3D generic facial landmarks model points for PnP pose estimation
        self.model_points_3d = np.array([
            (0.0, 0.0, 0.0),             # Nose tip
            (0.0, -330.0, -65.0),        # Chin
            (-225.0, 170.0, -135.0),     # Left eye left corner
            (225.0, 170.0, -135.0),      # Right eye right corner
            (-150.0, -150.0, -125.0),    # Left mouth corner
            (150.0, -150.0, -125.0)      # Right mouth corner
        ], dtype=np.float64)

    def process(self, frame, output_frame=None):

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        mp_image = mp.Image(
            image_format=mp.ImageFormat.SRGB,
            data=rgb
        )

        timestamp_ms = int(
            (time.time() - self.start_time) * 1000
        )

        result = self.landmarker.detect_for_video(
            mp_image,
            timestamp_ms
        )

        output = output_frame if output_frame is not None else frame.copy()

        ear = 1.0
        eye_closed = False
        yawning = False

        head_pitch = 0.0
        head_yaw = 0.0
        head_roll = 0.0
        distracted = False
        distraction_duration = 0.0

        h, w = frame.shape[:2]

        if result.face_landmarks:
            landmarks = result.face_landmarks[0]
            
            # Helper to compute distance between two landmarks
            def dist(p1_idx, p2_idx):
                p1 = landmarks[p1_idx]
                p2 = landmarks[p2_idx]
                x1, y1 = p1.x * w, p1.y * h
                x2, y2 = p2.x * w, p2.y * h
                return np.sqrt((x1 - x2)**2 + (y1 - y2)**2)
                
            # Helper to calculate geometric EAR
            def calculate_eye_ear(indices):
                horiz = dist(indices[0], indices[1])
                vert1 = dist(indices[2], indices[3])
                vert2 = dist(indices[4], indices[5])
                return (vert1 + vert2) / (2.0 * horiz) if horiz != 0 else 0.0

            # MediaPipe Landmark Indices
            RIGHT_EYE = [33, 133, 159, 145, 158, 153]
            LEFT_EYE = [362, 263, 385, 380, 386, 374]
            
            left_ear_val = calculate_eye_ear(LEFT_EYE)
            right_ear_val = calculate_eye_ear(RIGHT_EYE)
            ear = (left_ear_val + right_ear_val) / 2.0
            
            # Blendshape blink values if available
            b_left, b_right = 0.0, 0.0
            if result.face_blendshapes:
                blendshapes = result.face_blendshapes[0]
                values = {item.category_name: item.score for item in blendshapes}
                b_left = values.get("eyeBlinkLeft", 0.0)
                b_right = values.get("eyeBlinkRight", 0.0)
                yawning = (values.get("jawOpen", 0.0) > 0.5)

            eye_closed = (ear < 0.22) or ((b_left > 0.45) and (b_right > 0.45))

            # 3D Head Pose Estimation via cv2.solvePnP
            try:
                image_points = np.array([
                    (landmarks[1].x * w, landmarks[1].y * h),       # Nose tip
                    (landmarks[152].x * w, landmarks[152].y * h),   # Chin
                    (landmarks[263].x * w, landmarks[263].y * h),   # Left eye left corner
                    (landmarks[33].x * w, landmarks[33].y * h),     # Right eye right corner
                    (landmarks[291].x * w, landmarks[291].y * h),   # Left mouth corner
                    (landmarks[61].x * w, landmarks[61].y * h)      # Right mouth corner
                ], dtype=np.float64)

                focal_length = w
                center = (w / 2, h / 2)
                cam_matrix = np.array([
                    [focal_length, 0, center[0]],
                    [0, focal_length, center[1]],
                    [0, 0, 1]
                ], dtype=np.float64)
                dist_coeffs = np.zeros((4, 1))

                success, rvec, tvec = cv2.solvePnP(self.model_points_3d, image_points, cam_matrix, dist_coeffs, flags=cv2.SOLVEPNP_ITERATIVE)
                if success:
                    rmat, _ = cv2.Rodrigues(rvec)
                    angles, _, _, _, _, _ = cv2.RQDecomp3x3(rmat)
                    head_pitch = round(float(angles[0]), 1)
                    head_yaw = round(float(angles[1]), 1)
                    head_roll = round(float(angles[2]), 1)
            except Exception:
                pass

        now = time.time()
        # Head inattention / distraction detection (looking away > 28° yaw or down > 22° pitch)
        is_looking_away = (abs(head_yaw) > 28.0) or (head_pitch < -22.0)
        if is_looking_away and result.face_landmarks:
            if self.distracted_start is None:
                self.distracted_start = now
            distraction_duration = max(0.0, now - self.distracted_start)
            if distraction_duration >= 2.5:
                distracted = True
        else:
            self.distracted_start = None

        # Robust eye closure tracking with 0.5s grace period
        if eye_closed:
            self.eye_open_start = None
            if self.eye_closed_start is None:
                self.eye_closed_start = now
        else:
            if self.eye_closed_start is not None:
                if self.eye_open_start is None:
                    self.eye_open_start = now
                if (now - self.eye_open_start) > 0.5:
                    duration = now - self.eye_closed_start
                    if 0.08 <= duration <= 0.8:
                        self.blink_count += 1
                    self.eye_closed_start = None
                    self.eye_open_start = None

        eye_closed_duration = 0.0
        if self.eye_closed_start is not None:
            eye_closed_duration = max(0.0, now - self.eye_closed_start)

        # Drowsiness state classification
        if eye_closed_duration >= 10.0:
            drowsiness_state = "UNCONSCIOUS_CRITICAL"
        elif eye_closed_duration >= 2.0:
            drowsiness_state = "SEVERE_DROWSINESS"
        elif eye_closed_duration >= 1.0:
            drowsiness_state = "DROWSINESS"
        elif distracted:
            drowsiness_state = "DISTRACTED"
        elif yawning:
            drowsiness_state = "POSSIBLE_DROWSINESS"
        else:
            drowsiness_state = "NORMAL"

        # Bounding box on face
        if result.face_landmarks:
            landmarks = result.face_landmarks[0]
            xs = [int(lm.x * w) for lm in landmarks]
            ys = [int(lm.y * h) for lm in landmarks]

            if xs and ys:
                x1 = max(min(xs), 0)
                y1 = max(min(ys), 0)
                x2 = min(max(xs), w - 1)
                y2 = min(max(ys), h - 1)
                color = (0, 0, 255) if (eye_closed or distracted) else (0, 255, 0)
                cv2.rectangle(output, (x1, y1), (x2, y2), color, 2)

        return {
            "frame": output,
            "ear": round(ear, 2),
            "eye_closed": eye_closed,
            "eye_closed_duration": round(eye_closed_duration, 1),
            "blink_count": self.blink_count,
            "blink_rate": self.blink_count,
            "yawning": yawning,
            "yawn_duration": 0.0,
            "head_pitch": head_pitch,
            "head_yaw": head_yaw,
            "head_roll": head_roll,
            "distracted": distracted,
            "distraction_duration": round(distraction_duration, 1),
            "drowsiness_state": drowsiness_state
        }

    def close(self):
        self.landmarker.close()
