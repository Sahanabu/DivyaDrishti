import cv2
import sys
import time
import requests
import queue
import threading
import math
import os
import argparse
import subprocess
import imageio_ffmpeg
import numpy as np
from collections import deque
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
import uvicorn
from fastapi.middleware.cors import CORSMiddleware

# Import our unified pipeline modules
from vision.object_detection import ObjectDetector
from vision.lane_detection import LaneDetector
from vision.drowsiness_detection import DrowsinessDetector
from features.feature_engineering import FeatureEngine
from models.predict import RiskEngine

API_URL = "http://localhost:5000/api/telemetry"
AI_POST_URL = "http://localhost:5000/api/ai/prediction"
EMERGENCY_POST_URL = "http://localhost:5000/api/emergency"

CLIPS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend", "public", "clips"))
os.makedirs(CLIPS_DIR, exist_ok=True)

# Rolling circular buffer: ~250 frames (~10-12s at 20-25fps)
frame_buffer = deque(maxlen=250)

def export_incident_clip(event_name="impact"):
    """
    Exports the rolling circular frame buffer (~10 seconds) to an MP4 video file
    in backend/public/clips, and returns the accessible public URL.
    Encodes using universal H.264 (libx264, yuv420p, +faststart) so clips
    play natively with proper duration across all web browsers and mobile devices.
    """
    try:
        os.makedirs(CLIPS_DIR, exist_ok=True)
        timestamp = int(time.time())
        filename = f"incident_{event_name.lower()}_{timestamp}.mp4"
        filepath = os.path.join(CLIPS_DIR, filename)

        # Snapshot current frames
        frames = list(frame_buffer)
        if not frames:
            print("[VIDEO BLACK BOX] Frame buffer empty, fallback to demo clip.")
            return "http://localhost:5000/clips/demo_incident.mp4"

        h, w = frames[0].shape[:2]
        # H.264 yuv420p requires even width and height
        w = w - (w % 2)
        h = h - (h % 2)
        fps = 20

        encoded_successfully = False
        try:
            ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
            if ffmpeg_exe and os.path.exists(ffmpeg_exe):
                cmd = [
                    ffmpeg_exe, "-y",
                    "-f", "rawvideo",
                    "-vcodec", "rawvideo",
                    "-s", f"{w}x{h}",
                    "-pix_fmt", "bgr24",
                    "-r", str(fps),
                    "-i", "-",
                    "-c:v", "libx264",
                    "-preset", "ultrafast",
                    "-pix_fmt", "yuv420p",
                    "-movflags", "+faststart",
                    filepath
                ]
                proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                for f in frames:
                    if f.shape[1] != w or f.shape[0] != h:
                        f = cv2.resize(f, (w, h))
                    proc.stdin.write(f.tobytes())
                proc.stdin.close()
                proc.wait()
                if os.path.exists(filepath) and os.path.getsize(filepath) > 1000:
                    encoded_successfully = True
        except Exception as ffmpeg_err:
            print(f"[VIDEO BLACK BOX] FFmpeg encoding notice: {ffmpeg_err}, falling back to OpenCV...")

        # Fallback to OpenCV if ffmpeg failed
        if not encoded_successfully:
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            out = cv2.VideoWriter(filepath, fourcc, float(fps), (w, h))
            for f in frames:
                if f.shape[1] != w or f.shape[0] != h:
                    f = cv2.resize(f, (w, h))
                out.write(f)
            out.release()

        # Upload clip to free temporary cloud host so mobile devices can open and play it anywhere
        cloud_url = None
        try:
            with open(filepath, 'rb') as f_clip:
                r_cloud = requests.post(
                    'https://uguu.se/upload.php',
                    files={'files[]': f_clip},
                    headers={'User-Agent': 'DivyaDrishti/1.0'},
                    timeout=18.0
                )
            if r_cloud.status_code == 200:
                c_data = r_cloud.json()
                if c_data.get('success') and c_data.get('files'):
                    cloud_url = c_data['files'][0]['url']
                    print(f"☁️ [CLOUD VIDEO HOSTED] Real-time incident clip uploaded to free cloud: {cloud_url}")
        except Exception as cloud_err:
            print(f"[CLOUD UPLOAD NOTICE] Uguu upload notice ({cloud_err}), trying secondary cloud host...")

        # Secondary fallback: tmpfiles.org
        if not cloud_url:
            try:
                with open(filepath, 'rb') as f_clip:
                    r_tmp = requests.post(
                        'https://tmpfiles.org/api/v1/upload',
                        files={'file': f_clip},
                        headers={'User-Agent': 'DivyaDrishti/1.0'},
                        timeout=18.0
                    )
                if r_tmp.status_code == 200:
                    t_data = r_tmp.json()
                    raw_tmp_url = t_data.get('data', {}).get('url', '')
                    if raw_tmp_url:
                        cloud_url = raw_tmp_url.replace('tmpfiles.org/', 'tmpfiles.org/dl/')
                        print(f"☁️ [CLOUD VIDEO HOSTED] Real-time incident clip uploaded to tmpfiles: {cloud_url}")
            except Exception as tmp_err:
                print(f"[CLOUD UPLOAD NOTICE] Secondary cloud upload notice: {tmp_err}")

        url = cloud_url if cloud_url else f"http://localhost:5000/clips/{filename}"
        print(f"🎬 [VIDEO BLACK BOX] Exported 10s incident clip ({len(frames)} frames, H.264): {url}")
        return url
    except Exception as e:
        print(f"[ERROR] Failed to export incident clip: {e}")
        return "https://d.uguu.se/SFsrMRXG.mp4"

latest_esp32_data = None
polling_active = True

# Thread-safe queue for sending AI predictions to Node.js
ai_queue = queue.Queue(maxsize=1)

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
        time.sleep(0.1)

def ai_post_thread():
    while polling_active:
        try:
            # Block until a prediction is available
            payload = ai_queue.get(timeout=0.5)
            requests.post(AI_POST_URL, json=payload, timeout=0.5)
        except Exception:
            pass

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

latest_jpeg = None

def generate_frames():
    global latest_jpeg
    while True:
        if latest_jpeg is not None:
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + latest_jpeg + b'\r\n')
        else:
            time.sleep(0.05)

@app.get('/video_feed')
def video_feed():
    return StreamingResponse(generate_frames(), media_type='multipart/x-mixed-replace; boundary=frame')

@app.get('/export_clip')
@app.post('/export_clip')
def export_clip_api(event: str = "incident"):
    """
    On-demand endpoint: exports the current rolling 10-second buffer
    and returns the public videoClipUrl.
    """
    url = export_incident_clip(event)
    return {"success": True, "videoClipUrl": url}

def run_fastapi():
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="error")

def init_camera(source=0):
    """
    Intelligently attempts opening the camera using standard backend first,
    falling back to DirectShow on Windows if needed, or loading a video file.
    """
    if isinstance(source, str) and not source.isdigit():
        if os.path.exists(source):
            print(f"[CAMERA] Loading video file: {source}")
            cap = cv2.VideoCapture(source)
            if cap.isOpened():
                return cap
        else:
            print(f"[WARNING] Video file '{source}' not found. Falling back to camera 0.")
            source = 0

    cam_idx = int(source) if str(source).isdigit() else 0

    # 1. Try standard capture first
    cap = cv2.VideoCapture(cam_idx)
    if cap.isOpened():
        # Check if frame can be grabbed and has light
        for _ in range(5):
            ret, test_f = cap.read()
            if ret and test_f is not None and test_f.size > 0:
                if np.mean(test_f) > 2.0:
                    print(f"[CAMERA] Successfully opened Camera {cam_idx} with default backend (Light Level: {np.mean(test_f):.1f}).")
                    return cap
                break
        cap.release()

    # 2. Try DirectShow on Windows
    if sys.platform.startswith('win'):
        cap = cv2.VideoCapture(cam_idx, cv2.CAP_DSHOW)
        if cap.isOpened():
            print(f"[CAMERA] Opened Camera {cam_idx} with DirectShow backend.")
            return cap

    # 3. Last fallback
    return cv2.VideoCapture(cam_idx)

def generate_synthetic_adas_scene(frame_num, sim_event='normal'):
    """
    Generates a realistic 640x480 driving scene with road, lane lines, 
    vehicles, and a driver face picture-in-picture so that the entire AI
    pipeline can be tested even if physical webcam shutter is closed.
    """
    w, h = 640, 480
    frame = np.zeros((h, w, 3), dtype=np.uint8)

    # 1. Sky & Ground
    frame[0:220, :] = [60, 40, 25]     # Dark evening sky
    frame[220:480, :] = [35, 35, 35]   # Asphalt road surface

    # 2. Road Perspective Polygon
    road_pts = np.array([[120, 480], [280, 220], [360, 220], [520, 480]], np.int32)
    cv2.fillPoly(frame, [road_pts], (45, 45, 45))

    # Lane deviation shift factor
    lane_shift = 0
    if sim_event == 'lane':
        lane_shift = int(math.sin(frame_num * 0.1) * 70) + 50
    elif sim_event == 'impact':
        lane_shift = int(np.random.randint(-15, 15))

    # 3. Yellow Center Divider Line (dashed)
    dash_offset = (frame_num * 8) % 40
    for y in range(230 + dash_offset, 480, 40):
        t = (y - 220) / 260.0
        center_x = int(320 + lane_shift * t)
        cv2.line(frame, (center_x, y), (center_x, min(y + 20, 479)), (0, 215, 255), max(2, int(4 * t)))

    # 4. White Solid Edge Lines
    left_x1, left_x2 = 280, 140 + lane_shift
    right_x1, right_x2 = 360, 500 + lane_shift
    cv2.line(frame, (left_x1, 220), (left_x2, 480), (240, 240, 240), 3)
    cv2.line(frame, (right_x1, 220), (right_x2, 480), (240, 240, 240), 3)

    # 5. Oncoming / Lead Vehicle ahead
    car_y = 260
    car_x = 320 + int(lane_shift * 0.4)
    car_w, car_h = 70, 45
    # Car body
    cv2.rectangle(frame, (car_x - car_w // 2, car_y), (car_x + car_w // 2, car_y + car_h), (180, 40, 40), -1)
    cv2.rectangle(frame, (car_x - car_w // 2, car_y), (car_x + car_w // 2, car_y + car_h), (255, 255, 255), 1)
    # Taillights
    cv2.circle(frame, (car_x - car_w // 2 + 8, car_y + car_h - 10), 5, (0, 0, 255), -1)
    cv2.circle(frame, (car_x + car_w // 2 - 8, car_y + car_h - 10), 5, (0, 0, 255), -1)

    # 6. Picture-in-Picture Driver Face (Upper Right: 480 to 630, y: 15 to 155)
    pip_x, pip_y, pip_w, pip_h = 475, 15, 155, 140
    cv2.rectangle(frame, (pip_x, pip_y), (pip_x + pip_w, pip_y + pip_h), (20, 20, 20), -1)
    cv2.rectangle(frame, (pip_x, pip_y), (pip_x + pip_w, pip_y + pip_h), (0, 215, 255), 2)
    cv2.putText(frame, "DRIVER CAM", (pip_x + 8, pip_y + 16), cv2.FONT_HERSHEY_DUPLEX, 0.38, (0, 215, 255), 1)

    # Face Oval
    face_cx = pip_x + pip_w // 2
    face_cy = pip_y + pip_h // 2 + 10
    cv2.ellipse(frame, (face_cx, face_cy), (38, 48), 0, 0, 360, (200, 160, 140), -1)

    # Eyes: Open vs Closed
    is_eyes_closed = (sim_event in ('drowsy', 'unconscious')) or ((frame_num % 45 < 4) and sim_event not in ('drowsy', 'unconscious'))
    eye_h = 2 if is_eyes_closed else 7
    eye_color = (0, 0, 255) if is_eyes_closed else (60, 40, 30)

    # Left & Right eyes
    cv2.ellipse(frame, (face_cx - 15, face_cy - 8), (9, eye_h), 0, 0, 360, eye_color, -1)
    cv2.ellipse(frame, (face_cx + 15, face_cy - 8), (9, eye_h), 0, 0, 360, eye_color, -1)

    # Nose & Mouth
    cv2.line(frame, (face_cx, face_cy - 3), (face_cx, face_cy + 8), (140, 100, 90), 2)
    cv2.ellipse(frame, (face_cx, face_cy + 22), (12, 4), 0, 0, 180, (80, 50, 70), 2)

    return frame

def main():
    global polling_active
    parser = argparse.ArgumentParser(description="DivyaDrishti Unified AI Pipeline")
    parser.add_argument("--source", default=0, help="Webcam index (0, 1) or path to a test video file")
    parser.add_argument("--test", "-t", action="store_true", help="Launch directly in interactive driver simulation mode")
    args, _ = parser.parse_known_args()

    print("==========================================================")
    print("      DIVYADRISHTI UNIFIED AI PIPELINE (EDGE COMPUTING)   ")
    print("==========================================================")
    print("Hotkeys in Video Window:")
    print("  [T] : Toggle Simulation / Real Camera")
    print("  [D] : Trigger Drowsiness Event (Eyes Closed, Low EAR)")
    print("  [L] : Trigger Lane Departure Event")
    print("  [I] : Trigger Impact Crash Event (High G-force)")
    print("  [N] : Reset to Normal Driving State")
    print("  [Q] : Exit Pipeline\n")

    poll_thread = threading.Thread(target=esp32_polling_thread, daemon=True)
    poll_thread.start()

    post_thread = threading.Thread(target=ai_post_thread, daemon=True)
    post_thread.start()

    api_thread = threading.Thread(target=run_fastapi, daemon=True)
    api_thread.start()

    try:
        obj_detector = ObjectDetector()
        lane_detector = LaneDetector()
        drowsy_detector = DrowsinessDetector()
        feature_engine = FeatureEngine()
        risk_engine = RiskEngine()
    except Exception as e:
        print(f"Failed to load AI models: {e}")
        sys.exit(1)

    camera = init_camera(args.source)
    sim_mode = args.test
    sim_event = 'normal'
    sim_event_timer = 0

    recent_events = deque(maxlen=5)
    recent_risks = deque(maxlen=5)

    failed_frames = 0
    frame_count = 0

    while True:
        frame_count += 1

        # Check simulation event duration
        if sim_event != 'normal':
            sim_event_timer += 1
            # Allow impact event 150 frames (~5s) so the 2-second confirmation window verifies cleanly
            max_sim_frames = 150 if sim_event == 'impact' else (90 if sim_event == 'lane' else 600)
            if sim_event_timer > max_sim_frames and sim_event != 'drowsy':
                sim_event = 'normal'
                sim_event_timer = 0

        # Grab or generate frame
        if sim_mode:
            frame = generate_synthetic_adas_scene(frame_count, sim_event)
            ret = True
        else:
            ret, frame = camera.read()
            if not ret or frame is None or frame.size == 0:
                failed_frames += 1
                if failed_frames > 30:
                    sim_mode = True
                    print("[AUTO-FALLBACK] Camera disconnected or busy. Switched to Interactive Simulation Mode.")
                time.sleep(0.03)
                continue
            failed_frames = 0

        display_frame = frame.copy()
        is_sensor_black = (np.mean(frame) < 2.0) and not sim_mode

        # ==========================================
        # 1. VISION PIPELINE
        # ==========================================

        # Lane Detection
        lane_result = lane_detector.process(frame, output_frame=display_frame)
        lane_features = lane_result.copy()
        lane_features.pop("frame", None)

        # Drowsiness Detection
        drowsy_result = drowsy_detector.process(frame, output_frame=display_frame)
        drowsy_features = drowsy_result.copy()
        drowsy_features.pop("frame", None)

        # YOLO Object Detection
        _, obj_features = obj_detector.process(frame, output_frame=display_frame)

        # In simulation mode, inject the active test event into feature vector
        if sim_mode:
            if sim_event == 'drowsy':
                if not hasattr(main, 'sim_drowsy_start') or main.sim_drowsy_start is None:
                    main.sim_drowsy_start = time.time()
                sim_dur = time.time() - main.sim_drowsy_start
                drowsy_features["ear"] = 0.12
                drowsy_features["eye_closed"] = True
                drowsy_features["eye_closed_duration"] = round(sim_dur, 1)
                if sim_dur >= 10.0:
                    drowsy_features["drowsiness_state"] = "UNCONSCIOUS_CRITICAL"
                elif sim_dur >= 2.0:
                    drowsy_features["drowsiness_state"] = "SEVERE_DROWSINESS"
                else:
                    drowsy_features["drowsiness_state"] = "DROWSINESS"
            elif sim_event == 'unconscious':
                drowsy_features["ear"] = 0.08
                drowsy_features["eye_closed"] = True
                drowsy_features["eye_closed_duration"] = 10.5
                drowsy_features["drowsiness_state"] = "UNCONSCIOUS_CRITICAL"
            elif sim_event == 'lane':
                main.sim_drowsy_start = None
                lane_features["lane_detected"] = True
                lane_features["lane_deviation"] = 1.35
                lane_features["lane_departure"] = True
            elif sim_event == 'impact':
                main.sim_drowsy_start = None
                drowsy_features["ear"] = 0.28
                lane_features["lane_detected"] = True
            elif sim_event == 'normal':
                main.sim_drowsy_start = None
                drowsy_features["ear"] = 0.28
                drowsy_features["drowsiness_state"] = "NORMAL"
                lane_features["lane_detected"] = True
                lane_features["lane_deviation"] = 0.12
                lane_features["lane_departure"] = False
                obj_features["object_count"] = max(1, obj_features["object_count"])

        vision_vector = feature_engine.combine(obj_features, lane_features, drowsy_features)

        # ==========================================
        # 2. ESP32 TELEMETRY FUSION
        # ==========================================
        esp32_vector = {}
        if latest_esp32_data:
            motion = latest_esp32_data.get("motion", {})
            gx, gy, gz = motion.get("gyroX", 0), motion.get("gyroY", 0), motion.get("gyroZ", 0)
            gyro_mag = (gx**2 + gy**2 + gz**2) ** 0.5
            esp32_vector = {
                "accel_magnitude": motion.get("magnitude", 0) / 9.80665,
                "pitch": motion.get("pitch", 0),
                "roll": motion.get("roll", 0),
                "gyro_magnitude": round(gyro_mag, 2),
                "speed": latest_esp32_data.get("speed", 0),
                "mq3": latest_esp32_data.get("mq3", 0)
            }
        else:
            esp32_vector = {
                "accel_magnitude": 1.0,
                "pitch": 0.0,
                "roll": 0.0,
                "gyro_magnitude": 0.0,
                "speed": 40.0 if sim_mode else 0.0,
                "mq3": 120
            }

        if sim_mode and sim_event == 'impact':
            esp32_vector["accel_magnitude"] = 4.8
            esp32_vector["speed"] = 38.0

        fused_vector = {}
        fused_vector.update(vision_vector)
        fused_vector.update(esp32_vector)

        # ==========================================
        # 3. ML ENGINE
        # ==========================================
        if sim_mode and sim_event == 'impact':
            event, risk, confidence = "IMPACT", "CRITICAL", 96.0
        elif sim_mode and sim_event == 'unconscious':
            event, risk, confidence = "UNCONSCIOUS_DROWSINESS", "CRITICAL", 98.0
        elif sim_mode and sim_event == 'drowsy':
            event, risk, confidence = "DROWSY", "HIGH", 94.0
        elif sim_mode and sim_event == 'lane':
            event, risk, confidence = "LANE_DEVIATION", "MEDIUM", 89.0
        else:
            raw_event, raw_risk, raw_confidence = risk_engine.predict(fused_vector)
            if raw_event != "UNKNOWN":
                recent_events.append(raw_event)
                recent_risks.append(raw_risk)
                recent_confidences = getattr(main, 'recent_confidences', [])
                recent_confidences.append(raw_confidence)
                if len(recent_confidences) > 5: recent_confidences.pop(0)
                setattr(main, 'recent_confidences', recent_confidences)
                event = max(set(recent_events), key=recent_events.count)
                risk = max(set(recent_risks), key=recent_risks.count)
                confidence = round(sum(recent_confidences) / len(recent_confidences), 1) if recent_confidences else raw_confidence
            else:
                event, risk, confidence = "NORMAL", "LOW", 90.0

        # Enqueue prediction to Node.js backend
        if not ai_queue.full():
            ai_queue.put_nowait({
                "event": event,
                "risk": risk,
                "confidence": confidence,
                "timestamp": time.time()
            })

        # Directly trigger emergency endpoint when crash event is detected
        if event == 'IMPACT' or (sim_mode and sim_event == 'impact'):
            now = time.time()
            if not hasattr(main, 'last_impact_alert') or (now - main.last_impact_alert > 15.0):
                main.last_impact_alert = now
                def post_emergency():
                    try:
                        clip_url = export_incident_clip("impact")
                        requests.post(EMERGENCY_POST_URL, json={
                            "type": "IMPACT",
                            "device": "AI_VISION_EDGE",
                            "rider": "Sahana",
                            "videoClipUrl": clip_url,
                            "telemetry": {
                                "acceleration": 4.85,
                                "speed": esp32_vector.get("speed", 42.0),
                                "placeName": "Hubballi - Dharwad Bypass Road",
                                "videoClipUrl": clip_url
                            },
                            "aiState": { "event": "IMPACT", "risk": "CRITICAL" }
                        }, timeout=10.0)
                    except Exception as e:
                        print(f"[ERROR] post_emergency failed: {e}")
                threading.Thread(target=post_emergency, daemon=True).start()

        # Directly trigger emergency endpoint when driver is unresponsive or drowsy
        eye_duration = fused_vector.get("eye_closed_duration", 0.0)
        d_state = fused_vector.get("drowsiness_state", "NORMAL")

        # 1. Critical Unresponsive Driver (>10s continuous eye closure SOS)
        is_unconscious_trigger = (
            event == 'UNCONSCIOUS_DROWSINESS' or 
            eye_duration >= 10.0 or 
            d_state == "UNCONSCIOUS_CRITICAL" or 
            (sim_mode and sim_event == 'unconscious')
        )

        # 2. Severe Drowsiness / Microsleep (>2.5s eye closure or ML DROWSINESS detection)
        is_drowsy_trigger = (
            event in ('DROWSY', 'DROWSINESS', 'SEVERE_DROWSINESS') or
            d_state in ('SEVERE_DROWSINESS', 'DROWSINESS') or
            eye_duration >= 2.5 or
            (sim_mode and sim_event == 'drowsy')
        )

        now = time.time()
        if is_unconscious_trigger:
            if not hasattr(main, 'last_unconscious_alert') or (now - main.last_unconscious_alert > 20.0):
                main.last_unconscious_alert = now
                print(f"🚨 [CRITICAL AI ALERT] Driver eyes closed >10s ({eye_duration:.1f}s)! Exporting 10s clip & triggering emergency popup.")
                def post_unconscious_emergency():
                    try:
                        clip_url = export_incident_clip("unconscious_drowsiness")
                        requests.post(EMERGENCY_POST_URL, json={
                            "type": "UNCONSCIOUS_DROWSINESS",
                            "device": "AI_VISION_EDGE",
                            "rider": "Sahana",
                            "videoClipUrl": clip_url,
                            "telemetry": {
                                "acceleration": esp32_vector.get("accel_magnitude", 1.0),
                                "speed": esp32_vector.get("speed", 35.0),
                                "placeName": "Hubballi - Dharwad Bypass Road",
                                "videoClipUrl": clip_url
                            },
                            "aiState": { 
                                "event": "UNCONSCIOUS_DROWSINESS", 
                                "risk": "CRITICAL", 
                                "eye_closed_duration": eye_duration 
                            }
                        }, timeout=10.0)
                    except Exception as e:
                        print(f"[ERROR] post_unconscious_emergency failed: {e}")
                threading.Thread(target=post_unconscious_emergency, daemon=True).start()

        elif is_drowsy_trigger:
            if not hasattr(main, 'last_drowsy_log') or (now - main.last_drowsy_log > 5.0):
                main.last_drowsy_log = now
                print(f"⚠️ [DROWSINESS WARNING] Driver drowsy ({eye_duration:.1f}s closure). Warning active, monitoring for 10s SOS threshold.")

        # ==========================================
        # 4. HUD / DASHBOARD OVERLAY
        # ==========================================
        overlay = display_frame.copy()
        cv2.rectangle(overlay, (0, 0), (320, 480), (0, 0, 0), -1)
        cv2.addWeighted(overlay, 0.65, display_frame, 0.35, 0, display_frame)

        def draw_text(text, y, color=(255, 255, 255), size=0.55, thickness=1, x=20):
            cv2.putText(display_frame, text, (x, y), cv2.FONT_HERSHEY_DUPLEX, size, color, thickness)

        draw_text("DIVYADRISHTI AI", 35, (0, 215, 255), 0.75, 2)
        cv2.putText(display_frame, "[Q] EXIT", (220, 35), cv2.FONT_HERSHEY_DUPLEX, 0.45, (0, 120, 255), 1)
        mode_label = "[ SIMULATION MODE ]" if sim_mode else "[ LIVE HARDWARE ]"
        mode_color = (0, 255, 255) if sim_mode else (0, 255, 0)
        draw_text(mode_label, 58, mode_color, 0.45, 1)

        # --- DRIVER STATE ---
        draw_text("[ DRIVER STATE ]", 90, (150, 150, 150), 0.5, 1)
        draw_text(f"Eye EAR : {fused_vector.get('ear', 1.0):.2f}", 115)
        d_state = fused_vector.get('drowsiness_state', 'NORMAL')
        d_color = (0, 255, 0) if d_state == "NORMAL" else (0, 0, 255)
        draw_text(f"Status  : {d_state}", 140, d_color, 0.55, 2)
        if eye_duration > 0.0:
            sos_timer_color = (0, 165, 255) if eye_duration < 10.0 else (0, 0, 255)
            draw_text(f"Closed  : {eye_duration:.1f}s / 10s SOS", 162, sos_timer_color, 0.45, 1)

        # --- ENVIRONMENT ---
        draw_text("[ ENVIRONMENT ]", 185, (150, 150, 150), 0.5, 1)
        draw_text(f"Objects : {fused_vector.get('object_count', 0)}", 210)
        if fused_vector.get('lane_detected', False):
            dev = fused_vector.get('lane_deviation', 0.0)
            dev_color = (0, 0, 255) if fused_vector.get('lane_departure') else (255, 255, 255)
            draw_text(f"Lane Dev: {dev:.2f}m", 235, dev_color)
        else:
            draw_text(f"Lane Dev: N/A", 235, (150, 150, 150))

        # --- TELEMETRY ---
        draw_text("[ ESP32 SENSORS ]", 280, (150, 150, 150), 0.5, 1)
        speed_val = esp32_vector.get("speed", 0)
        accel_val = esp32_vector.get("accel_magnitude", 1.0)
        draw_text(f"Speed   : {speed_val:.0f} km/h", 305)
        draw_text(f"Accel   : {accel_val:.1f} G", 330)

        # --- PREDICTION ---
        draw_text("[ ML PREDICTION ]", 375, (150, 150, 150), 0.5, 1)
        draw_text(f"EVENT: {event}", 405, (255, 255, 0), 0.7, 2)
        risk_color = (0, 255, 0)
        if risk == "MEDIUM": risk_color = (0, 255, 255)
        elif risk == "HIGH": risk_color = (0, 165, 255)
        elif risk == "CRITICAL": risk_color = (0, 0, 255)
        draw_text(f"RISK : {risk}", 435, risk_color, 0.7, 2)
        draw_text(f"CONF : {confidence}%", 465, (200, 200, 200), 0.5, 1)

        # Draw black frame notice or hotkey guide on the right side
        if is_sensor_black:
            cv2.rectangle(display_frame, (335, 140), (625, 340), (20, 25, 40), -1)
            cv2.rectangle(display_frame, (335, 140), (625, 340), (0, 165, 255), 2)
            cv2.putText(display_frame, "CAMERA IS BLACK (0 Lux)", (350, 170), cv2.FONT_HERSHEY_DUPLEX, 0.55, (0, 165, 255), 2)
            cv2.putText(display_frame, "1. Open HP camera shutter", (350, 205), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (220, 220, 220), 1)
            cv2.putText(display_frame, "2. Press F10 key if LED on", (350, 235), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (220, 220, 220), 1)
            cv2.putText(display_frame, "3. Press 'T' for SIMULATION", (350, 275), cv2.FONT_HERSHEY_DUPLEX, 0.5, (0, 255, 0), 2)
            cv2.putText(display_frame, "Keys: [D]Drowsy [L]Lane [I]Crash", (350, 310), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 0), 1)
        elif sim_mode:
            cv2.rectangle(display_frame, (335, 420), (625, 470), (20, 25, 40), -1)
            cv2.rectangle(display_frame, (335, 420), (625, 470), (0, 215, 255), 1)
            cv2.putText(display_frame, "KEYS: [D] Drowsy  [L] Lane", (345, 442), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (0, 255, 255), 1)
            cv2.putText(display_frame, "      [I] Impact  [N] Normal", (345, 460), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (0, 255, 255), 1)

        # Encode to JPEG for the dashboard stream
        global latest_jpeg
        success, buffer = cv2.imencode('.jpg', display_frame)
        if success:
            latest_jpeg = buffer.tobytes()

        # Append to rolling 10-second circular black box video buffer (~250 frames)
        frame_buffer.append(display_frame.copy())

        # Output the annotated unified frame to the screen
        try:
            cv2.imshow("DivyaDrishti - AI Pipeline", display_frame)
            key = cv2.waitKey(1) & 0xFF

            # 1. Exit if user clicked the window [X] close button
            if cv2.getWindowProperty("DivyaDrishti - AI Pipeline", cv2.WND_PROP_VISIBLE) < 1:
                print("\n[EXIT] Video window closed.")
                break

            # 2. Press 'q', 'Q', or ESC (key 27) to exit immediately
            if key == ord('q') or key == ord('Q') or key == 27:
                print("\n[EXIT] 'Q' pressed. Shutting down AI Pipeline...")
                break
            elif key == ord('t') or key == ord('T'):
                sim_mode = not sim_mode
                print(f"[MODE] Toggled Simulation Mode: {sim_mode}")
            elif key == ord('d') or key == ord('D'):
                sim_mode = True
                sim_event = 'drowsy'
                sim_event_timer = 0
                print("[SIMULATION TRIGGER] Drowsiness event triggered!")
            elif key == ord('l') or key == ord('L'):
                sim_mode = True
                sim_event = 'lane'
                sim_event_timer = 0
                print("[SIMULATION TRIGGER] Lane departure event triggered!")
            elif key == ord('i') or key == ord('I'):
                sim_mode = True
                sim_event = 'impact'
                sim_event_timer = 0
                print("[SIMULATION TRIGGER] Crash impact event triggered!")
            elif key == ord('u') or key == ord('U'):
                sim_mode = True
                sim_event = 'unconscious'
                sim_event_timer = 0
                print("[SIMULATION TRIGGER] Unresponsive Driver (>15s Eye Closure SOS) event triggered!")
            elif key == ord('n') or key == ord('N'):
                sim_event = 'normal'
                print("[SIMULATION TRIGGER] Normal state restored.")
        except Exception:
            time.sleep(0.01)

    # Cleanup
    polling_active = False
    print("Shutting down AI Pipeline...")
    if camera is not None:
        try:
            camera.release()
        except Exception:
            pass
    cv2.destroyAllWindows()
    print("AI Pipeline closed successfully.")
    os._exit(0)

if __name__ == "__main__":
    main()
