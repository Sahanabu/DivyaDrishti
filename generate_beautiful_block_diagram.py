"""
Ultra-Aesthetic, Publication-Grade Master Architecture Block Diagram
for DivyaDrishti Smart Helmet AI & Telemetry Platform.
Renders an ultra-high-resolution (300 DPI, 7800 x 4800) visual diagram.
"""

import os
import shutil
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.path import Path

# Use clean Windows system fonts
matplotlib.rcParams['font.sans-serif'] = ['Segoe UI', 'Arial', 'DejaVu Sans']
matplotlib.rcParams['font.family'] = 'sans-serif'

OUT_PATH = r"c:\Users\ratan\Desktop\DivyaDrishti\DivyaDrishti_Complete_System_Block_Diagram.png"
ARTIFACT_DIR = r"C:\Users\ratan\.gemini\antigravity\brain\065c7c42-b056-4299-a3db-4fe7f46496e3"
ARTIFACT_IMG_PATH = os.path.join(ARTIFACT_DIR, "DivyaDrishti_Complete_System_Block_Diagram.png")

def create_beautiful_diagram():
    # Canvas setup: 26 x 16 inches at 300 DPI = 7800 x 4800 pixels
    fig, ax = plt.subplots(figsize=(26, 16), dpi=300)
    ax.set_xlim(0, 26)
    ax.set_ylim(0, 16)
    ax.axis('off')

    # Background: Premium Deep Space Cyber Navy
    BG_DARK = '#070C16'
    fig.patch.set_facecolor(BG_DARK)
    ax.set_facecolor(BG_DARK)

    # 1. Draw subtle background blueprint grid dots
    grid_x = np.linspace(0.5, 25.5, 51)
    grid_y = np.linspace(0.5, 15.5, 31)
    for gx in grid_x:
        for gy in grid_y:
            dot = plt.Circle((gx, gy), 0.022, fc='#1E293B', ec='none', alpha=0.35, zorder=0)
            ax.add_patch(dot)

    # Palette Definitions (Neon Cyber Modern)
    C_HW_ACCENT  = '#38BDF8'   # Sky Blue
    C_HW_BG      = '#0A1726'
    C_HW_CARD    = '#102236'
    
    C_AI_ACCENT  = '#C084FC'   # Purple
    C_AI_BG      = '#18102E'
    C_AI_CARD    = '#231842'
    
    C_BE_ACCENT  = '#34D399'   # Emerald
    C_BE_BG      = '#07241A'
    C_BE_CARD    = '#0E3628'
    
    C_CL_ACCENT  = '#FB7185'   # Rose
    C_CL_BG      = '#270810'
    C_CL_CARD    = '#3B101C'
    
    C_FE_ACCENT  = '#22D3EE'   # Cyan
    C_FE_BG      = '#08212B'
    C_FE_CARD    = '#0F313E'
    
    C_QR_ACCENT  = '#FBBF24'   # Amber / Gold
    C_QR_BG      = '#261704'
    C_QR_CARD    = '#382207'

    # -------------------------------------------------------------
    # Helper: Draw glowing styled container
    # -------------------------------------------------------------
    def draw_glowing_container(x, y, w, h, title, subtitle_badge, accent_col, bg_col):
        # Outer soft glow shadow
        glow = patches.FancyBboxPatch((x-0.05, y-0.05), w+0.1, h+0.1, boxstyle="round,pad=0.15",
                                      fc=accent_col, ec='none', alpha=0.12, zorder=1)
        ax.add_patch(glow)
        # Deep dark drop shadow
        shadow = patches.FancyBboxPatch((x+0.1, y-0.1), w, h, boxstyle="round,pad=0.12",
                                        fc='#020408', ec='none', alpha=0.8, zorder=2)
        ax.add_patch(shadow)
        # Container body
        body = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.12",
                                      fc=bg_col, ec=accent_col, lw=2.4, zorder=3)
        ax.add_patch(body)
        
        # Header banner bar
        hbar_h = 0.62
        hbar = patches.FancyBboxPatch((x+0.08, y+h-hbar_h-0.08), w-0.16, hbar_h, boxstyle="round,pad=0.06",
                                      fc='#111C30', ec=accent_col, lw=1.2, zorder=4)
        ax.add_patch(hbar)
        
        # Title text & badge
        ax.text(x + 0.35, y + h - 0.39, title, ha='left', va='center',
                fontsize=11.2, fontweight='bold', color='#FFFFFF', zorder=5)
        
        # Pill badge on right
        badge_w = len(subtitle_badge) * 0.12 + 0.4
        badge_x = x + w - badge_w - 0.25
        badge_box = patches.FancyBboxPatch((badge_x, y + h - 0.54), badge_w, 0.32, boxstyle="round,pad=0.06",
                                           fc=accent_col, ec='none', zorder=5)
        ax.add_patch(badge_box)
        ax.text(badge_x + badge_w/2, y + h - 0.38, subtitle_badge, ha='center', va='center',
                fontsize=7.8, fontweight='bold', color='#0F172A', zorder=6)

    # -------------------------------------------------------------
    # Helper: Draw attractive nested card
    # -------------------------------------------------------------
    def draw_feature_card(x, y, w, h, icon_text, title, tag_pill, bullet_lines, border_col, bg_col, title_col='#FFFFFF'):
        card = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.08",
                                      fc=bg_col, ec=border_col, lw=1.3, zorder=6)
        ax.add_patch(card)
        
        # Icon circle
        ic_r = 0.22
        ic_x = x + 0.38
        ic_y = y + h - 0.38
        circle = plt.Circle((ic_x, ic_y), ic_r, fc=border_col, ec='#FFFFFF', lw=0.8, zorder=7)
        ax.add_patch(circle)
        ax.text(ic_x, ic_y, icon_text, ha='center', va='center',
                fontsize=6.8, fontweight='bold', color='#0A0F1D', zorder=8)
        
        # Title
        ax.text(x + 0.72, ic_y, title, ha='left', va='center',
                fontsize=9.2, fontweight='bold', color=title_col, zorder=7)
        
        # Tag pill on top right
        if tag_pill:
            tp_w = len(tag_pill) * 0.10 + 0.35
            tp_x = x + w - tp_w - 0.22
            tp_box = patches.FancyBboxPatch((tp_x, ic_y - 0.13), tp_w, 0.26, boxstyle="round,pad=0.04",
                                           fc='#1E293B', ec=border_col, lw=0.8, zorder=7)
            ax.add_patch(tp_box)
            ax.text(tp_x + tp_w/2, ic_y, tag_pill, ha='center', va='center',
                    fontsize=6.8, fontweight='bold', color=border_col, zorder=8)
            
        # Divider line
        div_y = y + h - 0.70
        ax.plot([x + 0.2, x + w - 0.2], [div_y, div_y], color='#334155', lw=0.8, zorder=7)
        
        # Bullets
        curr_y = div_y - 0.25
        for line in bullet_lines:
            ax.text(x + 0.25, curr_y, line, ha='left', va='center',
                    fontsize=7.5, color='#CBD5E1', zorder=7)
            curr_y -= 0.26

    # =========================================================================
    # 0. MASTER HEADER (Aesthetic Neon Glassmorphism Banner)
    # =========================================================================
    hdr_box = patches.FancyBboxPatch((0.6, 14.8), 24.8, 1.0, boxstyle="round,pad=0.1",
                                     fc='#0B1528', ec='#38BDF8', lw=2.2, zorder=10)
    ax.add_patch(hdr_box)
    
    # Glowing top accent line
    ax.plot([0.8, 25.2], [15.75, 15.75], color='#38BDF8', lw=3.0, zorder=11)
    
    ax.text(13.0, 15.42, "DIVYADRISHTI (DIVINE VISION) — COMPLETE SYSTEM BLOCK DIAGRAM",
            ha='center', va='center', fontsize=17.5, fontweight='bold', color='#38BDF8', zorder=12)
    ax.text(13.0, 15.02, "Multi-Modal IoT & Edge AI Safety Architecture: Embedded ESP32 Helmet  •  Vision & Sensor Fusion  •  Node.js Hub  •  Cloud SOS Gateways  •  React HUD  •  Bystander Lifeline",
            ha='center', va='center', fontsize=9.2, fontweight='normal', color='#E2E8F0', zorder=12)

    # =========================================================================
    # 1. SUBSYSTEM 1: EMBEDDED SMART HELMET (ESP32 HARDWARE NODE)
    # [x: 0.6, y: 7.2, w: 7.8, h: 7.3]
    # =========================================================================
    draw_glowing_container(0.6, 7.2, 7.8, 7.3, "1. EMBEDDED SMART HELMET HARDWARE", "ESP32 IoT Node", C_HW_ACCENT, C_HW_BG)

    # 1A. Power Supply Card
    draw_feature_card(0.8, 12.6, 7.4, 1.15, "PWR", "POWER REGULATION & MANAGEMENT", "3.3V DC Rail",
                      ["• 3.7V LiPo Battery / USB 5V Input  →  Onboard Ultra-Low Dropout (LDO) Regulator",
                       "• Regulated 3.3V Common Rail powering ESP32, Sensor Cluster & OLED",
                       "• Low-power standby & brownout detection circuitry for continuous operation"],
                      '#38BDF8', C_HW_CARD, '#BAE6FD')

    # 1B. Central Microcontroller (ESP-WROOM-32)
    draw_feature_card(0.8, 10.9, 7.4, 1.55, "MCU", "ESP-WROOM-32 DUAL-CORE MICROCONTROLLER", "240MHz / 4MB Flash",
                      ["• Dual-Core 32-bit Xtensa LX6 @ 240 MHz  |  520 KB SRAM  |  Wi-Fi 802.11 b/g/n (2.4GHz)",
                       "• Non-Blocking Event-Loop Task Scheduler (0% delay blocking, millis() timers)",
                       "• Hardware Peripherals: I2C (400kHz), SPI (10MHz), UART2 (9600), 12-bit ADC1, LEDC PWM",
                       "• Fast Sampling Intervals: IMU (150ms), MQ3 (500ms), GPS (Continuous), POST (3000ms)"],
                      '#0284C7', '#0A1C30', '#38BDF8')

    # 1C. Sensors Grid (2x2)
    draw_feature_card(0.8, 9.35, 3.6, 1.4, "IMU", "MPU-6050 6-AXIS IMU", "I2C 400kHz",
                      ["• Pins: GPIO 21 (SDA), GPIO 22 (SCL)",
                       "• Accel ±8g & Gyroscope ±500°/s",
                       "• Crash Alert: |A| >= 25.0 m/s² (~2.55G)",
                       "• Trigonometric Pitch & Roll Angle math"],
                      '#38BDF8', C_HW_CARD, '#E0F2FE')

    draw_feature_card(4.6, 9.35, 3.6, 1.4, "GPS", "QUECTEL L86-M33 GNSS", "UART2 9600",
                      ["• Pins: GPIO 16 (RX2), GPIO 17 (TX2)",
                       "• GPS + GLONASS + Galileo + EASY™",
                       "• NMEA 0183 Parser ($GNRMC, $GNGGA)",
                       "• Real-time Speed (km/h) & 2-Fix Lock"],
                      '#38BDF8', C_HW_CARD, '#E0F2FE')

    draw_feature_card(0.8, 7.8, 3.6, 1.45, "GAS", "MQ-3 ALCOHOL SENSOR", "ADC1 12-Bit",
                      ["• Pin: GPIO 34 (Analog ADC1_CH6)",
                       "• SnO2 Breath Chamber Ethanol Sensor",
                       "• 0–4095 ADC scale (sampled @ 2Hz)",
                       "• Pre-Ride Anti-DUI Interlock check"],
                      '#38BDF8', C_HW_CARD, '#E0F2FE')

    draw_feature_card(4.6, 7.8, 3.6, 1.45, "RFID", "MFRC522 RFID READER", "SPI 10MHz",
                      ["• Pins: GPIO 5, 18, 19, 23, 4 (RST)",
                       "• 13.56 MHz ISO 14443A Card Reader",
                       "• Rider Smart Card Tap Authentication",
                       "• 1-Hour Secure Session Gatekeeper"],
                      '#38BDF8', C_HW_CARD, '#E0F2FE')

    # 1D. Actuators Card
    draw_feature_card(0.8, 6.75, 7.4, 0.45, "ACT", "ACTUATORS: SH1106 1.3\" OLED DISPLAY & PIEZO SIREN", "I2C / PWM",
                      ["• 7-Page Rotating Dashboard (Summary, Rider, GPS, Safety, Motion, Diag)  |  Acoustic Siren & Melodies"],
                      '#38BDF8', '#0A1C30', '#BAE6FD')

    # =========================================================================
    # 2. SUBSYSTEM 2: EDGE AI COMPUTER VISION & SENSOR FUSION NODE
    # [x: 9.1, y: 7.2, w: 7.8, h: 7.3]
    # =========================================================================
    draw_glowing_container(9.1, 7.2, 7.8, 7.3, "2. EDGE AI VISION & SENSOR FUSION", "Python Edge", C_AI_ACCENT, C_AI_BG)

    # 2A. Optical Capture & Black Box
    draw_feature_card(9.3, 12.6, 7.4, 1.15, "CAM", "OPTICAL INGESTION & VIDEO BLACK BOX", "H.264 Buffer",
                      ["• HD Camera / Webcam (720p/1080p @ 30 FPS) DirectShow / V4L2 Ingestion Engine",
                       "• Circular Video Buffer: 250 Frames deque in RAM (~10-12s rolling history @ 20-25 FPS)",
                       "• Universal H.264 Encoder (libx264, yuv420p, +faststart) for immediate mobile playback"],
                      '#C084FC', C_AI_CARD, '#F3E8FF')

    # 2B. Parallel Computer Vision Engines
    draw_feature_card(9.3, 10.9, 7.4, 1.55, "CV", "PARALLEL COMPUTER VISION PIPELINE", "YOLO & MediaPipe",
                      ["• YOLOv8n Object Detector: COCO 6-Class Detection (Cars, Buses, Trucks, Motorcycles, Pedestrians)",
                       "   Monocular Pinhole Distance: Z = (Real_Width × Focal_Length) / Bounding_Box_Pixel_Width",
                       "• Polynomial Lane Departure: HLS S-Channel (150-255), Sobel-X 3x3 Gradient, Trapezoid ROI Masking,",
                       "   2nd-Degree Polynomial Fit (ax²+bx+c) + EMA Smoothing (α=0.2)  →  Lane Departure Alert (>0.4m)",
                       "• Drowsiness Engine: MediaPipe Face Mesh (478 3D points), 6-point Eye Aspect Ratio (EAR),",
                       "   Blink Blendshapes & Duration FSM: Warning (>1s), Severe (>2s), Unconscious SOS (>10s)"],
                      '#A855F7', '#251545', '#E9D5FF')

    # 2C. 12D Sensor Fusion & Random Forest Classifier
    draw_feature_card(9.3, 9.1, 7.4, 1.65, "ML", "12D SENSOR FUSION & DUAL RANDOM FOREST ML", "Dual Forest",
                      ["• Feature Fusion Vector: Combines Vision + ESP32 Telemetry (Polled at 10 Hz from Node.js API)",
                       "   X = [ ear, eye_closed_dur, blink_rate, lane_deviation, lane_departure, object_count,",
                       "         accel_magnitude, pitch, roll, gyro_magnitude, speed, mq3 ]",
                       "• Model 1 - Event Classifier (100 Trees): NORMAL, TURNING, BRAKING, LANE_DEPARTURE,",
                       "   DROWSINESS, IMPACT (Trained on 10,000-sample realistic driving permutations)",
                       "• Model 2 - Risk Stratifier (50 Trees): LOW, MEDIUM, HIGH, CRITICAL + Confidence %"],
                      '#C084FC', C_AI_CARD, '#F3E8FF')

    # 2D. FastAPI Edge Service
    draw_feature_card(9.3, 7.6, 7.4, 1.35, "API", "FASTAPI EDGE MICROSERVICE (:8000)", "FastAPI / Uvicorn",
                      ["• /video_feed: High-throughput multipart/x-mixed-replace MJPEG camera stream with AI HUD overlays",
                       "• /export_clip: On-demand incident video clip export & instant cloud CDN upload pipeline",
                       "• Background Threads: Non-blocking Telemetry Polling (10 Hz) & Prediction POSTing (20 Hz)"],
                      '#A855F7', '#251545', '#E9D5FF')

    # =========================================================================
    # 3. SUBSYSTEM 3: CENTRAL COORDINATION SERVER (NODE.JS / EXPRESS / SOCKET.IO)
    # [x: 9.1, y: 0.9, w: 7.8, h: 6.0]
    # =========================================================================
    draw_glowing_container(9.1, 0.9, 7.8, 6.0, "3. CENTRAL COORDINATION SERVER", "Node.js & WS", C_BE_ACCENT, C_BE_BG)

    draw_feature_card(9.3, 4.9, 7.4, 1.35, "REST", "RESTFUL INGESTION & AUTHENTICATION (:5000)", "Express 5.x",
                      ["• POST /api/telemetry: Ingests ESP32 sensor packets (speed, lat/lon, IMU, MQ3) every 3.0 seconds",
                       "• POST /api/ai/prediction: Ingests real-time AI states; evaluates critical collision thresholds",
                       "• POST /api/rfid/authenticate: Validates smart cards, issues JWT session tokens & HTTP-only cookies",
                       "• POST /api/emergency/cancel & dispatch: Controls false-alarm SOS countdown lifecycle"],
                      '#34D399', C_BE_CARD, '#D1FAE5')

    draw_feature_card(9.3, 3.0, 7.4, 1.75, "ENG", "CORE SYSTEM LOGIC & EMERGENCY CONTROLLERS", "Decision Engine",
                      ["• Hardware Watchdog: Flags ESP32 offline if no packet for 5.5s; force-logs out session at 20s",
                       "• Multi-GNSS Geocoding Service: Reverse geocodes lat/lon via OpenStreetMap Nominatim for street",
                       "   names; automatically falls back to Wi-Fi BSSID AP triangulation when GPS fix is lost",
                       "• Emergency Decision Controller: Dual-trigger evaluation (Accel > 25G OR Vision Crash/Unresponsive),",
                       "   enforces 2-second debounce suppression window, coordinates 10-second cancelable countdown"],
                      '#10B981', '#062B1E', '#A7F3D0')

    draw_feature_card(9.3, 1.25, 7.4, 1.6, "WS", "SOCKET.IO BIDIRECTIONAL WEBSOCKET ENGINE", "Sub-10ms WS",
                      ["• Low-Latency Real-Time Event Broadcasts to all Connected Web Dashboard Clients:",
                       "   - telemetry_update: Broadcasts live speed, GPS coordinates, IMU angles, alcohol reading",
                       "   - ai_prediction: Streams real-time event classification, risk level, and confidence %",
                       "   - emergency_pending: Triggers high-priority 10-second cancelable SOS modal with video preview",
                       "   - emergency_dispatched, emergency_cancelled, esp32_status, login_status"],
                      '#34D399', C_BE_CARD, '#D1FAE5')

    # =========================================================================
    # 4. SUBSYSTEM 4: CLOUD PERSISTENCE & SAFETY GATEWAYS
    # [x: 17.6, y: 7.2, w: 7.8, h: 7.3]
    # =========================================================================
    draw_glowing_container(17.6, 7.2, 7.8, 7.3, "4. CLOUD PERSISTENCE & SAFETY GATEWAYS", "Cloud Mesh", C_CL_ACCENT, C_CL_BG)

    draw_feature_card(17.8, 12.35, 7.4, 1.5, "DB", "MONGODB ATLAS CLOUD PERSISTENCE", "M0 TLS Cluster",
                      ["• Telemetry Collection: Complete historical time-series sensor packets from ESP32",
                       "• AIPredictions Collection: Event classifications, risk strata, confidence scores",
                       "• Emergencies Collection: Crash incident audits, verified GPS locations, dispatch status",
                       "• Sessions & RfidCards Collections: Active login tokens and authorized card registry"],
                      '#FB7185', C_CL_CARD, '#FFE4E6')

    draw_feature_card(17.8, 10.45, 7.4, 1.75, "SMS", "TWILIO PROGRAMMABLE SMS API GATEWAY", "Cellular SMS",
                      ["• Outbound HTTPS REST API call to Twilio Global Telecommunication Cloud",
                       "• Automated High-Priority Alert to Family Guardian Phone (+91 8431712890):",
                       "   - Rider Identity: Sahana | Status: Crash Impact Verified / Unresponsive Driver",
                       "   - Geocoded Place Name & Speed at Impact  |  Exact Google Maps Deep Link Pin",
                       "   - Direct Playable Cloud URL to 10-Second Incident Black Box Video Clip"],
                      '#F43F5E', '#360913', '#FECDD3')

    draw_feature_card(17.8, 8.65, 7.4, 1.65, "PUSH", "NTFY.SH REAL-TIME PUSH NOTIFICATION GATEWAY", "Mobile Push",
                      ["• Instant High-Priority Push Notification to Guardian Smartphone (NTFY App / Browser)",
                       "• Audible Emergency Siren Ringtone with Urgent Priority Level",
                       "• Direct Click-to-Open Google Maps navigation pin link to accident site",
                       "• Direct Attachment Preview of the 10-Second Incident Black Box MP4 Video"],
                      '#FB7185', C_CL_CARD, '#FFE4E6')

    draw_feature_card(17.8, 7.5, 7.4, 1.0, "CDN", "CLOUD INCIDENT VIDEO HOSTING CDN", "Uguu / TmpFiles",
                      ["• Zero-configuration temporary cloud hosting of accident video clips (MP4 format)",
                       "• Provides instant public CDN URLs accessible on all iOS, Android, and desktop browsers"],
                      '#F43F5E', '#360913', '#FECDD3')

    # =========================================================================
    # 5. SUBSYSTEM 5: REACT 19 LIVE TELEMETRY DASHBOARD
    # [x: 17.6, y: 0.9, w: 7.8, h: 6.0]
    # =========================================================================
    draw_glowing_container(17.6, 0.9, 7.8, 6.0, "5. REACT 19 LIVE TELEMETRY DASHBOARD", "Web Client HUD", C_FE_ACCENT, C_FE_BG)

    draw_feature_card(17.8, 4.95, 7.4, 1.3, "MAP", "LEAFLET GPS MAPPING & SENSOR HUD", "OpenStreetMap",
                      ["• Leaflet.js / React-Leaflet Map: Dark-mode tile map with live dynamic GPS pin marker",
                       "• Recharts Telemetry Charts: Real-time trends for Speed, Accel G-Force, and MQ-3 Alcohol",
                       "• Live Hardware Status Cards: Real-time badges for ESP32, GPS Lock, and Wi-Fi latency"],
                      '#22D3EE', C_FE_CARD, '#CFFAFE')

    draw_feature_card(17.8, 3.25, 7.4, 1.55, "HUD", "AI VISION STREAM HUD & DROWSINESS METER", "FastAPI Embed",
                      ["• Embedded FastAPI MJPEG Camera Stream with dynamic YOLOv8 & Lane Departure graphics",
                       "• Real-time Drowsiness Gauge: Displays Eye Aspect Ratio (EAR) and closure alert state",
                       "• AI Prediction Badge: Displays live Random Forest event classification and model confidence %",
                       "• Telemetry Gauges: Radial speedometer, tilt attitude indicator (pitch/roll), and alcohol meter"],
                      '#06B6D4', '#092733', '#A5F3FC')

    draw_feature_card(17.8, 1.25, 7.4, 1.85, "SOS", "10-SECOND INTERACTIVE EMERGENCY SOS MODAL", "Cancelable HUD",
                      ["• High-Priority Audio-Visual Alarm triggered upon Crash or >10s Unresponsiveness",
                       "• 10-Second Visual Circular Countdown with Pulse Animation (Framer Motion)",
                       "• Video Black Box Incident Preview: Plays the recorded 10-second crash clip",
                       "• Dual Safety Action Controls:",
                       "   - 'CANCEL (FALSE ALARM)': Aborts dispatch if rider is uninjured (speed bump / drop)",
                       "   - 'CONFIRM / CALL NOW': Immediately bypasses countdown and fires emergency SOS"],
                      '#22D3EE', C_FE_CARD, '#CFFAFE')

    # =========================================================================
    # 6. SUBSYSTEM 6: BYSTANDER EMERGENCY LIFELINE & HELMET QR PORTAL
    # [x: 0.6, y: 0.9, w: 7.8, h: 6.0]
    # =========================================================================
    draw_glowing_container(0.6, 0.9, 7.8, 6.0, "6. BYSTANDER LIFELINE & HELMET QR PORTAL", "Zero-App ICE", C_QR_ACCENT, C_QR_BG)

    draw_feature_card(0.8, 4.95, 7.4, 1.3, "QR", "PHYSICAL HELMET QR CODE DECALS", "ISO/IEC 18004",
                      ["• Dual Weatherproof High-Contrast Vinyl Stickers placed on Helmet Brow & Nape",
                       "• Enables Any Bystander or Paramedic to Scan using Standard Smartphone Camera",
                       "• Zero App Installation, Zero Account Setup, Zero Login Barrier (Static GitHub Pages)"],
                      '#FBBF24', C_QR_CARD, '#FEF3C7')

    draw_feature_card(0.8, 3.15, 7.4, 1.65, "MED", "INSTANT CRITICAL MEDICAL PROFILE HUD", "Blood Group A+",
                      ["• High-Visibility Medical Card: Rider Name (Sahana)  |  Blood Group (A+ Urgent)",
                       "• Vehicle Registration: Honda Activa KA 28 HM 8281  |  Home Address: Koppal, Karnataka",
                       "• Medical Condition & Allergy Alerts for Emergency Medical Responders",
                       "• Witness Check-In Module: Collects Good Samaritan Name, Phone, and HTML5 GPS Location"],
                      '#F59E0B', '#2D1B05', '#FDE68A')

    draw_feature_card(0.8, 1.25, 7.4, 1.75, "SOS", "ONE-TAP DIRECT ACTIONS & LEGAL IMMUNITY", "WhatsApp / 108",
                      ["• One-Tap Urgent WhatsApp Alert: Formatted message with GPS pin link sent to family",
                       "• Direct Family Call Button: Instantly dials Guardian Phone (+91 8431712890)",
                       "• One-Click State EMS Hotlines: Direct dials 108 (Ambulance) / 112 (National Emergency)",
                       "• Good Samaritan Notice: Highlights Section 134A Motor Vehicles Act Legal Immunity"],
                      '#FBBF24', C_QR_CARD, '#FEF3C7')

    # =========================================================================
    # 7. INTER-SUBSYSTEM CONNECTION ARROWS & PROTOCOL CALLOUTS
    # =========================================================================

    # Arrow 1: ESP32 to Node.js Backend (Telemetry POST)
    ax.annotate('', xy=(9.1, 5.6), xytext=(8.4, 11.5),
                arrowprops=dict(arrowstyle="->", color='#38BDF8', lw=2.8,
                                connectionstyle="arc3,rad=-0.16"))
    ax.text(8.75, 8.55, "HTTP POST /api/telemetry (Every 3s)\nWi-Fi 802.11 b/g/n [JSON Telemetry]",
            ha='center', va='center', fontsize=7.8, fontweight='bold', color='#38BDF8',
            bbox=dict(boxstyle="round,pad=0.25", fc='#0B1528', ec='#38BDF8', lw=1.2, alpha=0.95))

    # Arrow 2: Backend Telemetry to AI Fusion Engine (Polling GET)
    ax.annotate('', xy=(12.0, 9.1), xytext=(12.0, 6.3),
                arrowprops=dict(arrowstyle="->", color='#C084FC', lw=2.4, linestyle='--'))
    ax.text(12.0, 7.6, "HTTP GET /api/telemetry\n(10 Hz Telemetry Polling)",
            ha='center', va='center', fontsize=7.5, fontweight='bold', color='#E9D5FF',
            bbox=dict(boxstyle="round,pad=0.2", fc='#1A103C', ec='#C084FC', lw=1, alpha=0.9))

    # Arrow 3: AI Predictions to Backend (Prediction POST)
    ax.annotate('', xy=(14.5, 6.3), xytext=(14.5, 7.6),
                arrowprops=dict(arrowstyle="->", color='#C084FC', lw=2.8))
    ax.text(14.5, 6.95, "HTTP POST /api/ai/prediction (20 Hz)\n[Event, Risk Level, Confidence %]",
            ha='center', va='center', fontsize=7.5, fontweight='bold', color='#E9D5FF',
            bbox=dict(boxstyle="round,pad=0.2", fc='#1A103C', ec='#C084FC', lw=1, alpha=0.9))

    # Arrow 4: Backend to React Dashboard (Socket.IO WebSockets)
    ax.annotate('', xy=(17.6, 3.9), xytext=(16.9, 3.9),
                arrowprops=dict(arrowstyle="->", color='#34D399', lw=3.2))
    ax.text(17.25, 4.4, "Socket.IO Real-Time Stream\ntelemetry_update, ai_prediction,\nemergency_pending (10s SOS)",
            ha='center', va='center', fontsize=7.8, fontweight='bold', color='#A7F3D0',
            bbox=dict(boxstyle="round,pad=0.25", fc='#07241A', ec='#34D399', lw=1.2, alpha=0.95))

    # Arrow 5: Backend to MongoDB Atlas
    ax.annotate('', xy=(17.6, 13.0), xytext=(16.9, 5.8),
                arrowprops=dict(arrowstyle="->", color='#FB7185', lw=2.8,
                                connectionstyle="arc3,rad=-0.12"))
    ax.text(17.25, 9.9, "Mongoose ODM (TLS / 27017)\nPersist Telemetry, Predictions,\nEmergency Logs & Sessions",
            ha='center', va='center', fontsize=7.5, fontweight='bold', color='#FECDD3',
            bbox=dict(boxstyle="round,pad=0.25", fc='#270810', ec='#FB7185', lw=1.2, alpha=0.95))

    # Arrow 6: Backend Emergency Controller to Twilio & NTFY
    ax.annotate('', xy=(17.8, 11.2), xytext=(16.9, 3.4),
                arrowprops=dict(arrowstyle="->", color='#FB7185', lw=2.8,
                                connectionstyle="arc3,rad=-0.22"))
    ax.text(17.3, 7.9, "HTTPS Outbound REST APIs\nTwilio SMS + NTFY.SH Push\n(10s Timer Expiry / Confirm)",
            ha='center', va='center', fontsize=7.5, fontweight='bold', color='#FDA4AF',
            bbox=dict(boxstyle="round,pad=0.25", fc='#270810', ec='#FB7185', lw=1.2, alpha=0.95))

    # Arrow 7: AI Black Box to Cloud CDN
    ax.annotate('', xy=(17.8, 7.9), xytext=(16.9, 7.9),
                arrowprops=dict(arrowstyle="->", color='#C084FC', lw=2.4))
    ax.text(17.35, 8.25, "Upload 10s Clip (MP4)",
            ha='center', va='center', fontsize=7.2, fontweight='bold', color='#E9D5FF',
            bbox=dict(boxstyle="round,pad=0.15", fc='#1A103C', ec='#C084FC', lw=1, alpha=0.9))

    # Arrow 8: AI Video Stream to React Dashboard HUD
    ax.annotate('', xy=(19.0, 4.8), xytext=(16.7, 7.6),
                arrowprops=dict(arrowstyle="->", color='#22D3EE', lw=2.2, linestyle=':',
                                connectionstyle="arc3,rad=-0.15"))
    ax.text(18.0, 6.2, "FastAPI MJPEG Stream\n(:8000/video_feed)",
            ha='center', va='center', fontsize=7.2, fontweight='bold', color='#A5F3FC',
            bbox=dict(boxstyle="round,pad=0.15", fc='#08212B', ec='#22D3EE', lw=1, alpha=0.9))

    # =========================================================================
    # 8. MASTER LEGEND BANNER AT BOTTOM
    # =========================================================================
    leg_box = patches.FancyBboxPatch((0.6, 0.15), 24.8, 0.62, boxstyle="round,pad=0.06",
                                     fc='#0B1528', ec='#334155', lw=1.2, zorder=10)
    ax.add_patch(leg_box)
    
    legend_items = [
        ("[#] Embedded Hardware (ESP32)", '#38BDF8'),
        ("[#] Edge AI & Vision Node", '#C084FC'),
        ("[#] Central Node.js Server", '#34D399'),
        ("[#] Cloud DB & Alert Gateways", '#FB7185'),
        ("[#] React Live Dashboard HUD", '#22D3EE'),
        ("[#] Bystander QR Lifeline", '#FBBF24'),
        ("--> Direct Network Flow", '#E2E8F0'),
        ("- - Polling Stream", '#94A3B8'),
    ]
    curr_lx = 0.95
    for text, col in legend_items:
        ax.text(curr_lx, 0.46, text, ha='left', va='center', fontsize=8.2, fontweight='bold', color=col, zorder=11)
        curr_lx += 3.0

    # Save master diagram
    plt.tight_layout()
    plt.savefig(OUT_PATH, dpi=300, facecolor=fig.get_facecolor(), edgecolor='none')
    plt.close()
    print(f"Generated attractive block diagram at: {OUT_PATH}")
    
    # Copy to artifact folder
    os.makedirs(ARTIFACT_DIR, exist_ok=True)
    shutil.copy2(OUT_PATH, ARTIFACT_IMG_PATH)
    print(f"Copied to artifact directory: {ARTIFACT_IMG_PATH}")

if __name__ == '__main__':
    create_beautiful_diagram()
