import cv2
import numpy as np
import math
import os

def create_splash_video():
    source_img_path = r"C:\Users\ratan\.gemini\antigravity\brain\19e8ea83-d11e-4cf2-8b31-ad8c1cf53aae\divyadrishti_splash_screen_1793199606104.jpg"
    out_video_path1 = r"c:\Users\ratan\Desktop\DivyaDrishti\android\app\src\main\res\raw\helmet_splash_video.mp4"
    out_video_path2 = r"C:\Users\ratan\AndroidStudioProjects\SafeRideAI\app\src\main\res\raw\helmet_splash_video.mp4"
    
    img = cv2.imread(source_img_path)
    if img is None:
        raise ValueError(f"Could not load image: {source_img_path}")
    
    # Target resolution: 720 x 1280 (Standard HD 9:16)
    W, H = 720, 1280
    base_img = cv2.resize(img, (W, H), interpolation=cv2.INTER_LANCZOS4)
    
    fps = 30
    total_frames = 105  # 3.5 seconds
    
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    temp_video = "temp_helmet_splash.mp4"
    out = cv2.VideoWriter(temp_video, fourcc, fps, (W, H))
    
    # Coordinates of helmet forehead AI sensor & visor center
    sensor_x, sensor_y = W // 2, int(H * 0.32)
    visor_center_y = int(H * 0.44)
    
    for f in range(total_frames):
        t = f / float(total_frames)
        
        # 1. Subtle cinematic push-in (zoom from 1.0 to 1.05)
        zoom = 1.0 + 0.05 * (math.sin(t * math.pi / 2))
        nw, nh = int(W * zoom), int(H * zoom)
        zoomed = cv2.resize(base_img, (nw, nh), interpolation=cv2.INTER_LINEAR)
        dx = (nw - W) // 2
        dy = (nh - H) // 2
        frame = zoomed[dy:dy+H, dx:dx+W].copy().astype(np.float32)
        
        # 2. Fade in from black during frames 0..22
        if f < 22:
            fade = f / 22.0
            frame = frame * fade
        
        # 3. Holographic laser scanline sweeping across visor (frames 15..65)
        if 15 <= f <= 65:
            scan_progress = (f - 15) / 50.0  # 0 to 1
            scan_y = int(H * 0.22 + scan_progress * (H * 0.40))
            
            # Create horizontal cyan laser beam with Gaussian glow
            y_indices = np.arange(H)
            dist_to_scan = np.abs(y_indices - scan_y)
            beam_mask = np.exp(- (dist_to_scan ** 2) / (2 * (8.0 ** 2))) # sigma = 8
            
            # Add cyan laser light: BGR (255, 230, 0)
            glow_layer = np.zeros_like(frame)
            glow_layer[:, :, 0] += beam_mask[:, None] * 255.0  # Blue
            glow_layer[:, :, 1] += beam_mask[:, None] * 230.0  # Green
            glow_layer[:, :, 2] += beam_mask[:, None] * 50.0   # Red (cyan glow)
            
            frame = cv2.add(frame, glow_layer * 0.85)
        
        # 4. Expanding radar sonar waves from forehead sensor (frames 25..85)
        if f >= 25:
            radar_cycle = ((f - 25) % 35) / 35.0  # cycles every ~1.1s
            radius = int(radar_cycle * 260)
            ring_alpha = max(0.0, 1.0 - radar_cycle) * 0.65
            
            overlay = frame.copy().astype(np.uint8)
            cv2.circle(overlay, (sensor_x, sensor_y), radius, (255, 220, 0), 2, cv2.LINE_AA)
            cv2.circle(overlay, (sensor_x, sensor_y), max(2, radius - 20), (0, 200, 255), 1, cv2.LINE_AA)
            
            # Blend ring
            frame = (1.0 - ring_alpha) * frame + ring_alpha * overlay.astype(np.float32)
            
            # Forehead sensor bright neon pulse
            sensor_pulse = 0.5 + 0.5 * math.sin(f * 0.3)
            p_radius = int(6 + 4 * sensor_pulse)
            cv2.circle(frame, (sensor_x, sensor_y), p_radius, (255, 255, 120), -1, cv2.LINE_AA)
        
        # 5. Cybernetic HUD Telemetry Diagnostics Overlay (frames 30..100)
        hud_alpha = 0.0
        if 30 <= f < 45:
            hud_alpha = (f - 30) / 15.0
        elif 45 <= f <= 95:
            hud_alpha = 1.0
        elif f > 95:
            hud_alpha = max(0.0, 1.0 - (f - 95) / 10.0)
            
        if hud_alpha > 0.05:
            hud_canvas = np.zeros_like(frame, dtype=np.uint8)
            
            # Tech Reticle / Target corners
            box_w, box_h = 240, 140
            bx1, by1 = (W - box_w) // 2, visor_center_y - box_h // 2
            bx2, by2 = bx1 + box_w, by1 + box_h
            
            c_len = 18
            color_cyan = (255, 230, 0)
            color_amber = (0, 190, 255)
            
            # Corner markers
            cv2.line(hud_canvas, (bx1, by1), (bx1 + c_len, by1), color_cyan, 2)
            cv2.line(hud_canvas, (bx1, by1), (bx1, by1 + c_len), color_cyan, 2)
            
            cv2.line(hud_canvas, (bx2, by1), (bx2 - c_len, by1), color_cyan, 2)
            cv2.line(hud_canvas, (bx2, by1), (bx2, by1 + c_len), color_cyan, 2)
            
            cv2.line(hud_canvas, (bx1, by2), (bx1 + c_len, by2), color_cyan, 2)
            cv2.line(hud_canvas, (bx1, by2), (bx1, by2 - c_len), color_cyan, 2)
            
            cv2.line(hud_canvas, (bx2, by2), (bx2 - c_len, by2), color_cyan, 2)
            cv2.line(hud_canvas, (bx2, by2), (bx2, by2 - c_len), color_cyan, 2)
            
            # Real-time boot diagnostics text
            diag1 = "[ IMU 6-DOF: ONLINE ]"
            diag2 = "[ GYRO / SPEED: SYNCED ]"
            diag3 = "[ AI ACCIDENT DEFENSE: ACTIVE ]"
            
            font = cv2.FONT_HERSHEY_SIMPLEX
            cv2.putText(hud_canvas, diag1, (bx1 + 16, by1 + 35), font, 0.45, color_cyan, 1, cv2.LINE_AA)
            cv2.putText(hud_canvas, diag2, (bx1 + 16, by1 + 65), font, 0.45, color_amber, 1, cv2.LINE_AA)
            cv2.putText(hud_canvas, diag3, (bx1 + 16, by1 + 95), font, 0.42, (0, 255, 120), 1, cv2.LINE_AA)
            
            frame = cv2.addWeighted(frame, 1.0, hud_canvas.astype(np.float32), hud_alpha * 0.9, 0)
        
        # 6. Clip and write frame
        frame = np.clip(frame, 0, 255).astype(np.uint8)
        out.write(frame)
        
    out.release()
    print(f"Video encoded successfully to {temp_video}!")
    
    # Copy to both locations
    import shutil
    shutil.copyfile(temp_video, out_video_path1)
    shutil.copyfile(temp_video, out_video_path2)
    video_size = os.path.getsize(out_video_path1)
    print(f"Copied to {out_video_path1} ({video_size} bytes)")
    print(f"Copied to {out_video_path2} ({video_size} bytes)")

if __name__ == "__main__":
    create_splash_video()
