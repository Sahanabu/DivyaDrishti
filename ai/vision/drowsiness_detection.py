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

        self.previous_left_blink = False
        self.previous_right_blink = False

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

        left_blink = 0.0
        right_blink = 0.0

        head_pitch = 0.0
        head_yaw = 0.0
        head_roll = 0.0

        if result.face_landmarks:
            landmarks = result.face_landmarks[0]
            
            # Helper to compute distance between two landmarks
            def dist(p1_idx, p2_idx):
                p1 = landmarks[p1_idx]
                p2 = landmarks[p2_idx]
                # Un-normalize coordinates using frame dimensions
                x1, y1 = p1.x * frame.shape[1], p1.y * frame.shape[0]
                x2, y2 = p2.x * frame.shape[1], p2.y * frame.shape[0]
                return np.sqrt((x1 - x2)**2 + (y1 - y2)**2)
                
            # Helper to calculate geometric EAR
            def calculate_eye_ear(indices):
                # indices: [corner1, corner2, top1, bottom1, top2, bottom2]
                h = dist(indices[0], indices[1])
                v1 = dist(indices[2], indices[3])
                v2 = dist(indices[4], indices[5])
                return (v1 + v2) / (2.0 * h) if h != 0 else 0.0

            # MediaPipe Landmark Indices
            RIGHT_EYE = [33, 133, 159, 145, 158, 153]
            LEFT_EYE = [362, 263, 385, 380, 386, 374]
            
            left_ear_val = calculate_eye_ear(LEFT_EYE)
            right_ear_val = calculate_eye_ear(RIGHT_EYE)
            
            # Override blendshape scores with actual geometric measurements
            ear = (left_ear_val + right_ear_val) / 2.0
            
            # Blendshape blink values if available
            b_left, b_right = 0.0, 0.0
            if result.face_blendshapes:
                blendshapes = result.face_blendshapes[0]
                values = {item.category_name: item.score for item in blendshapes}
                b_left = values.get("eyeBlinkLeft", 0.0)
                b_right = values.get("eyeBlinkRight", 0.0)
                yawning = (values.get("jawOpen", 0.0) > 0.5)

            # Using fused threshold: EAR < 0.22 or blendshape blink > 0.45
            eye_closed = (ear < 0.22) or ((b_left > 0.45) and (b_right > 0.45))
            
            # For display purposes
            left_blink = left_ear_val
            right_blink = right_ear_val

        now = time.time()
        # Robust eye closure tracking with 0.5s grace period for eye flutter/jitter
        if eye_closed:
            self.eye_open_start = None
            if self.eye_closed_start is None:
                self.eye_closed_start = now
        else:
            if self.eye_closed_start is not None:
                if self.eye_open_start is None:
                    self.eye_open_start = now
                # Eyes must stay open continuously for > 0.5s before resetting closed timer
                if (now - self.eye_open_start) > 0.5:
                    duration = now - self.eye_closed_start
                    if 0.08 <= duration <= 0.8:
                        self.blink_count += 1
                    self.eye_closed_start = None
                    self.eye_open_start = None

        eye_closed_duration = 0.0
        if self.eye_closed_start is not None:
            eye_closed_duration = max(0.0, now - self.eye_closed_start)

        # Drowsiness state (SOS triggered after 10s of continuous eye closure)
        if eye_closed_duration >= 10.0:
            drowsiness_state = "UNCONSCIOUS_CRITICAL"

        elif eye_closed_duration >= 2.0:

            drowsiness_state = "SEVERE_DROWSINESS"

        elif eye_closed_duration >= 1.0:

            drowsiness_state = "DROWSINESS"

        elif yawning:

            drowsiness_state = "POSSIBLE_DROWSINESS"

        else:

            drowsiness_state = "NORMAL"

        # Display face detection status
        if result.face_landmarks:

            landmarks = result.face_landmarks[0]

            xs = [
                int(lm.x * frame.shape[1])
                for lm in landmarks
            ]

            ys = [
                int(lm.y * frame.shape[0])
                for lm in landmarks
            ]

            if xs and ys:

                x1 = max(min(xs), 0)
                y1 = max(min(ys), 0)
                x2 = min(max(xs), frame.shape[1] - 1)
                y2 = min(max(ys), frame.shape[0] - 1)

                cv2.rectangle(
                    output,
                    (x1, y1),
                    (x2, y2),
                    (255, 0, 0),
                    2
                )

        return {
            "frame": output,
            "ear": ear,
            "eye_closed": eye_closed,
            "eye_closed_duration": eye_closed_duration,
            "blink_count": self.blink_count,
            "blink_rate": self.blink_count,
            "yawning": yawning,
            "yawn_duration": 0.0,
            "head_pitch": head_pitch,
            "head_yaw": head_yaw,
            "head_roll": head_roll,
            "drowsiness_state": drowsiness_state
        }

    def close(self):
        self.landmarker.close()
