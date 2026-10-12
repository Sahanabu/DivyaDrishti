import cv2
import time
import requests
import pandas as pd
import os
import datetime

from vision.object_detection import ObjectDetector
from vision.lane_detection import LaneDetector
from vision.drowsiness_detection import DrowsinessDetector
from features.feature_engineering import FeatureEngine

# ======================================================================
# CONFIGURATION
# ======================================================================
API_URL = "http://localhost:5000/api/telemetry"
DATASET_FILE = "dataset/raw_data.csv"

# Label mapping for keyboard inputs during collection
LABEL_MAP = {
    ord('n'): "NORMAL",
    ord('b'): "BRAKING",
    ord('t'): "TURNING",
    ord('l'): "LANE_DEPARTURE",
    ord('d'): "DROWSINESS",
    ord('i'): "IMPACT",
    ord('f'): "FALL"
}

import threading

# Global variable to hold the latest ESP32 data without blocking the camera
latest_esp32_data = None
polling_active = True

def esp32_polling_thread():
    global latest_esp32_data
    while polling_active:
        try:
            response = requests.get(API_URL, timeout=0.5)
            if response.status_code == 200:
                data = response.json().get("data", [])
                if data:
                    latest_esp32_data = data[0]
        except Exception:
            pass
        # Poll at 10Hz so we don't overwhelm the Node.js server
        time.sleep(0.1)

def get_latest_esp32_data():
    """Returns the most recent ESP32 telemetry from the background thread."""
    return latest_esp32_data

def main():
    global polling_active
    print("=============================================")
    print(" DIVYADRISHTI - ML DATASET COLLECTOR         ")
    print("=============================================")
    print("Loading vision models (YOLO, MediaPipe)...")
    
    # Start the background ESP32 polling thread
    poll_thread = threading.Thread(target=esp32_polling_thread, daemon=True)
    poll_thread.start()
    
    # Ensure dataset directory exists
    os.makedirs(os.path.dirname(DATASET_FILE), exist_ok=True)
    
    obj_detector = ObjectDetector()
    lane_detector = LaneDetector()
    drowsy_detector = DrowsinessDetector()
    feature_engine = FeatureEngine()

    camera = cv2.VideoCapture(1)
    
    current_label = "NORMAL"
    print("\n--- RECORDING INSTRUCTIONS ---")
    print("Ensure your Node.js backend is running to capture ESP32 data.")
    print("While the camera window is active, press the following keys to label the live data:")
    print(" [N] - NORMAL (Default)")
    print(" [B] - BRAKING")
    print(" [T] - TURNING")
    print(" [L] - LANE_DEPARTURE")
    print(" [D] - DROWSINESS")
    print(" [Q] - QUIT and Save to CSV")
    
    dataset = []
    
    while True:
        ret, frame = camera.read()
        if not ret: 
            print("Error: Could not read frame.")
            break
        
        display_frame = frame.copy()
        timestamp = datetime.datetime.now().isoformat()
        
        # ---------------------------------------------------------
        # 1. VISION FEATURES
        # ---------------------------------------------------------
        lane_result = lane_detector.process(frame, output_frame=display_frame)
        drowsy_result = drowsy_detector.process(frame, output_frame=display_frame)
        _, obj_features = obj_detector.process(frame, output_frame=display_frame)
        
        # Clean dicts (remove massive image arrays before fusion)
        lane_features = lane_result.copy()
        lane_features.pop("frame", None)
        
        drowsy_features = drowsy_result.copy()
        drowsy_features.pop("frame", None)
        
        vision_vector = feature_engine.combine(obj_features, lane_features, drowsy_features)
        
        # ---------------------------------------------------------
        # 2. ESP32 FEATURES
        # ---------------------------------------------------------
        esp32_data = get_latest_esp32_data()
        esp32_vector = {}
        
        if esp32_data:
            motion = esp32_data.get("motion", {})
            gps = esp32_data.get("gps", {})
            
            # Derived gyro magnitude proxy
            gx, gy, gz = motion.get("gyroX", 0), motion.get("gyroY", 0), motion.get("gyroZ", 0)
            gyro_mag = (gx**2 + gy**2 + gz**2) ** 0.5
            
            esp32_vector = {
                "accel_x": motion.get("accelX", 0),
                "accel_y": motion.get("accelY", 0),
                "accel_z": motion.get("accelZ", 0),
                "accel_magnitude": motion.get("magnitude", 0),
                "gyro_x": gx,
                "gyro_y": gy,
                "gyro_z": gz,
                "gyro_magnitude": round(gyro_mag, 2),
                "pitch": motion.get("pitch", 0),
                "roll": motion.get("roll", 0),
                "gps_lat": gps.get("latitude", 0),
                "gps_lon": gps.get("longitude", 0),
                "speed": gps.get("speed", 0),
                "mq3": esp32_data.get("mq3", 0)
            }
        else:
            # Fallback padding if Node.js is down or ESP32 isn't sending
            esp32_vector = {
                "accel_x": 0, "accel_y": 0, "accel_z": 0, "accel_magnitude": 0,
                "gyro_x": 0, "gyro_y": 0, "gyro_z": 0, "gyro_magnitude": 0,
                "pitch": 0, "roll": 0, "gps_lat": 0, "gps_lon": 0, "speed": 0, "mq3": 0
            }
            
        # ---------------------------------------------------------
        # 3. FUSION & LABELING
        # ---------------------------------------------------------
        fused_row = {"timestamp": timestamp, "label": current_label}
        fused_row.update(vision_vector)
        fused_row.update(esp32_vector)
        
        dataset.append(fused_row)
        
        # UI Feedback for labeling
        color = (0, 0, 255) if current_label != "NORMAL" else (0, 255, 0)
        cv2.putText(display_frame, f"RECORDING: {current_label}", (20, 280), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.9, color, 3)
                    
        cv2.imshow("DivyaDrishti - Data Collection", display_frame)
        
        # Handle keyboard input
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
        elif key in LABEL_MAP:
            current_label = LABEL_MAP[key]
            print(f"\r[LABEL CHANGED] Now recording: {current_label}".ljust(60))
            
    # ---------------------------------------------------------
    # 4. SAVE TO CSV
    # ---------------------------------------------------------
    polling_active = False # Stop the thread
    if dataset:
        print("\nSaving dataset...")
        df = pd.DataFrame(dataset)
        
        if os.path.exists(DATASET_FILE):
            df.to_csv(DATASET_FILE, mode='a', header=False, index=False)
        else:
            df.to_csv(DATASET_FILE, index=False)
            
        print(f"✅ Successfully saved {len(dataset)} labeled rows to {DATASET_FILE}")
        
    camera.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
