"""
Generate the Single Comprehensive Master Block Diagram for DivyaDrishti Smart Helmet System.
Outputs a publication-quality 300-DPI high-resolution image.
"""

import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import shutil

# Set fonts that support English and Devanagari cleanly
matplotlib.rcParams['font.sans-serif'] = ['Segoe UI', 'Nirmala UI', 'Arial', 'DejaVu Sans']
matplotlib.rcParams['axes.edgecolor'] = '#CBD5E1'
matplotlib.rcParams['axes.linewidth'] = 1.0

def generate_master_block_diagram():
    out_path = r"c:\Users\ratan\Desktop\DivyaDrishti\DivyaDrishti_Complete_System_Block_Diagram.png"
    artifact_dir = r"C:\Users\ratan\.gemini\antigravity\brain\065c7c42-b056-4299-a3db-4fe7f46496e3"
    artifact_img_path = os.path.join(artifact_dir, "DivyaDrishti_Complete_System_Block_Diagram.png")
    
    # 26 x 16.5 inches at 300 DPI = 7800 x 4950 pixels (Ultra-HD 8K / Print Quality)
    fig, ax = plt.subplots(figsize=(26, 16.5), dpi=300)
    ax.set_xlim(0, 26)
    ax.set_ylim(0, 16.5)
    ax.axis('off')
    
    # Background color - crisp modern dark engineering blueprint
    fig.patch.set_facecolor('#080E1A')
    ax.set_facecolor('#080E1A')

    # Color Palette Definitions
    C_HW_BORDER = '#38BDF8'      # Sky Blue (Hardware)
    C_HW_BG = '#0C1B2E'
    C_AI_BORDER = '#A855F7'      # Purple (AI / Vision)
    C_AI_BG = '#1A103C'
    C_BE_BORDER = '#10B981'      # Emerald (Backend)
    C_BE_BG = '#062B21'
    C_CL_BORDER = '#F43F5E'      # Rose / Red (Cloud & Safety)
    C_CL_BG = '#310A14'
    C_FE_BORDER = '#06B6D4'      # Cyan (Frontend Dashboard)
    C_FE_BG = '#06232E'
    C_QR_BORDER = '#F59E0B'      # Amber (Bystander QR Lifeline)
    C_QR_BG = '#2A1704'

    # Helper function for drawing styled subsystem containers
    def draw_container(x, y, w, h, title, border_col, bg_col, tag=""):
        # Shadow
        shadow = patches.FancyBboxPatch((x+0.07, y-0.07), w, h, boxstyle="round,pad=0.12",
                                        fc='#020617', ec='none', alpha=0.7, zorder=1)
        ax.add_patch(shadow)
        # Main box
        box = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.12",
                                     fc=bg_col, ec=border_col, lw=2.4, zorder=2)
        ax.add_patch(box)
        # Title Banner
        t_box = patches.FancyBboxPatch((x+0.1, y+h-0.72), w-0.2, 0.62, boxstyle="round,pad=0.06",
                                       fc=border_col, ec='none', zorder=3)
        ax.add_patch(t_box)
        ax.text(x + w/2, y + h - 0.41, title, ha='center', va='center',
                fontsize=11.5, fontweight='bold', color='#FFFFFF', zorder=4)
        if tag:
            ax.text(x + w - 0.35, y + h - 0.41, f"[{tag}]", ha='right', va='center',
                    fontsize=8.5, fontweight='bold', color='#FFFFFF', alpha=0.95, zorder=4)

    # Helper function for nested module cards
    def draw_card(x, y, w, h, title, subtitle_list, border_col='#475569', bg_col='#1E293B', title_col='#FFFFFF'):
        card = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.07",
                                      fc=bg_col, ec=border_col, lw=1.3, zorder=5)
        ax.add_patch(card)
        ax.text(x + 0.2, y + h - 0.26, title, ha='left', va='center',
                fontsize=9.2, fontweight='bold', color=title_col, zorder=6)
        curr_y = y + h - 0.56
        for line in subtitle_list:
            ax.text(x + 0.2, curr_y, line, ha='left', va='center',
                    fontsize=7.8, color='#CBD5E1', zorder=6)
            curr_y -= 0.29

    # =========================================================================
    # 0. MASTER HEADER
    # =========================================================================
    hdr_box = patches.FancyBboxPatch((0.6, 15.2), 24.8, 1.05, boxstyle="round,pad=0.08",
                                     fc='#111C30', ec='#38BDF8', lw=2.2, zorder=10)
    ax.add_patch(hdr_box)
    ax.text(13.0, 15.82, "DIVYADRISHTI (DIVINE VISION) — COMPLETE SYSTEM BLOCK DIAGRAM",
            ha='center', va='center', fontsize=18, fontweight='bold', color='#38BDF8', zorder=11)
    ax.text(13.0, 15.44, "Complete Multi-Modal Architecture: Embedded Smart Helmet (ESP32)  |  Edge AI Vision & Sensor Fusion  |  Node.js Backend  |  Cloud SOS Gateways  |  React Live HUD",
            ha='center', va='center', fontsize=9.5, fontweight='normal', color='#E2E8F0', zorder=11)

    # =========================================================================
    # 1. SUBSYSTEM 1: EMBEDDED SMART HELMET HARDWARE (ESP32 EDGE)
    # [x: 0.6, y: 7.4, w: 7.8, h: 7.5]
    # =========================================================================
    draw_container(0.6, 7.4, 7.8, 7.5, "1. EMBEDDED SMART HELMET (ESP32 HARDWARE NODE)", C_HW_BORDER, C_HW_BG, "IoT Edge")

    # 1A. Power Supply Module
    draw_card(0.8, 13.1, 7.4, 0.95, "POWER REGULATION & DISTRIBUTION",
              ["• 3.7V LiPo Battery / USB 5V Input  →  Onboard 3.3V Ultra-Low Dropout (LDO) Regulator",
               "• Regulated 3.3V DC Common Supply Rail to ESP32 MCU, Sensors, and OLED Display"],
              '#38BDF8', '#132337', '#38BDF8')

    # 1B. Central Microcontroller (ESP-WROOM-32)
    draw_card(0.8, 11.2, 7.4, 1.7, "CENTRAL MICROCONTROLLER: ESP32 (ESP-WROOM-32)",
              ["• Dual-Core 32-bit Xtensa LX6 @ 240 MHz  |  520 KB SRAM  |  4 MB SPI Flash",
               "• Wi-Fi 802.11 b/g/n (2.4 GHz) Station Mode  |  Non-Blocking Event Loop Scheduler",
               "• Integrated Hardware Peripherals: I2C (400kHz), SPI (10MHz), UART2 (9600), ADC1 (12-bit), LEDC PWM",
               "• Non-blocking Task Intervals: MPU6050 (150ms), MQ-3 (500ms), GPS (Continuous/1Hz), OLED (100ms), POST (3s)"],
              '#0284C7', '#0B1B2B', '#38BDF8')

    # 1C. Input Sensors Grid (2x2)
    draw_card(0.8, 9.6, 3.6, 1.45, "MPU-6050 6-AXIS IMU",
              ["• Protocol: I2C (GPIO 21 SDA / 22 SCL)",
               "• ±8g Accelerometer & ±500°/s Gyro",
               "• Crash Threshold: |A| >= 25.0 m/s² (~2.55G)",
               "• Gyro Roll/Pitch Lean Angle Trigonometry"],
              '#38BDF8', '#132337', '#BAE6FD')

    draw_card(4.6, 9.6, 3.6, 1.45, "QUECTEL L86-M33 MULTI-GNSS",
              ["• Protocol: UART2 (GPIO 16 RX / 17 TX)",
               "• GPS + GLONASS + Galileo + EASY™",
               "• NMEA 0183 Parser ($GNRMC, $GNGGA)",
               "• Speed (km/h), Coordinates, 2-Fix Hysteresis"],
              '#38BDF8', '#132337', '#BAE6FD')

    draw_card(0.8, 7.8, 3.6, 1.65, "MQ-3 ALCOHOL GAS SENSOR",
              ["• Protocol: Analog ADC1 (GPIO 34)",
               "• SnO2 Metal Oxide Vapor Sensor",
               "• Breath Chamber Ethanol Sampling",
               "• 12-Bit ADC Value (0 - 4095 range)",
               "• Anti-DUI Safety Ignition Gate"],
              '#38BDF8', '#132337', '#BAE6FD')

    draw_card(4.6, 7.8, 3.6, 1.65, "MFRC522 RFID READER",
              ["• Protocol: SPI (GPIO 5,18,19,23,4)",
               "• 13.56 MHz ISO/IEC 14443 Type A",
               "• Contactless Rider Smart Card Tap",
               "• 4/7-Byte UID Authentication Check",
               "• Gated 1-Hour Session Access Token"],
              '#38BDF8', '#132337', '#BAE6FD')

    # 1D. Actuators
    draw_card(0.8, 7.0, 7.4, 0.65, "ON-HELMET ACTUATORS: SH1106 OLED (128x64 I2C) & PIEZO BUZZER (GPIO 25 PWM)",
              ["• 7-Page Rotating Dashboard: Summary, Rider ID, Session Time, GPS Location, Safety/Alcohol, Motion IMU, Diagnostics",
               "• Acoustic Siren & Audio Feedback: 4-note ascending melody on login; loud frequency sweeps on crash/hazard"],
              '#38BDF8', '#0B1B2B', '#38BDF8')

    # =========================================================================
    # 2. SUBSYSTEM 2: EDGE AI COMPUTER VISION & SENSOR FUSION NODE
    # [x: 9.1, y: 7.4, w: 7.8, h: 7.5]
    # =========================================================================
    draw_container(9.1, 7.4, 7.8, 7.5, "2. EDGE AI VISION & SENSOR FUSION NODE (FASTAPI / PY)", C_AI_BORDER, C_AI_BG, "Host Edge")

    # 2A. Camera Ingestion
    draw_card(9.3, 13.1, 7.4, 0.95, "OPTICAL INGESTION & ROLLING VIDEO BLACK BOX",
              ["• HD Camera / Webcam (720p / 1080p @ 30 FPS) DirectShow / V4L2 Video Capture Engine",
               "• Circular Frame Buffer: 250 Frames deque (~10-12s @ 20-25 FPS) in System RAM Memory",
               "• Universal H.264 Encoder (libx264, yuv420p, +faststart) for Universal Mobile/Browser Playback"],
              '#A855F7', '#221445', '#C084FC')

    # 2B. Parallel Computer Vision Modules
    draw_card(9.3, 11.2, 7.4, 1.7, "PARALLEL COMPUTER VISION PIPELINE (OPENCV & MEDIAPIPE)",
              ["• YOLOv8n Object Detector: COCO 6-Class Detection (Car, Bus, Truck, Bike, Person) + Pinhole Distance (Z = W*f/w)",
               "• Lane Departure Warning: HLS S-Channel Filter (150-255), Sobel-X 3x3 Gradient, Trapezoid ROI Masking,",
               "   2nd-Degree Polynomial Curve Fit (ax²+bx+c) with EMA Smoothing (α=0.2) → Lane Offset Deviation (m)",
               "• Drowsiness Engine: MediaPipe Face Landmarker (478 3D points), 6-point Eye Aspect Ratio (EAR),",
               "   Blink Blendshapes & Duration State Machine: Warning (>1s), Severe (>2s), Unconscious SOS (>10s)"],
              '#C084FC', '#2D165B', '#E9D5FF')

    # 2C. 12D Feature Fusion & Random Forest Classifier
    draw_card(9.3, 9.1, 7.4, 1.9, "12-DIMENSIONAL SENSOR FUSION & DUAL RANDOM FOREST ML ENGINES",
              ["• Feature Fusion Vector: Combines Vision + ESP32 Telemetry (Polled at 10 Hz from Node.js API)",
               "   X = [ ear, eye_closed_dur, blink_rate, lane_deviation, lane_departure, object_count,",
               "         accel_magnitude, pitch, roll, gyro_magnitude, speed, mq3 ]",
               "• 1. Event Classifier: Random Forest (100 Trees) → NORMAL, TURNING, BRAKING, LANE_DEPARTURE,",
               "   DROWSINESS, IMPACT (Trained on 10,000-sample driving dataset)",
               "• 2. Risk Stratifier: Random Forest (50 Trees) → LOW, MEDIUM, HIGH, CRITICAL + Confidence %"],
              '#A855F7', '#221445', '#C084FC')

    # 2D. FastAPI Microservice
    draw_card(9.3, 7.7, 7.4, 1.25, "FASTAPI EDGE MICROSERVICE (PORT 8000)",
              ["• /video_feed: Real-time multipart/x-mixed-replace MJPEG camera stream with AI bounding boxes",
               "• /export_clip: On-demand rolling 10-second crash incident video export & CDN upload trigger",
               "• Background Daemon Threads: ESP32 Telemetry Polling (10 Hz) & Prediction POSTing (20 Hz)"],
              '#A855F7', '#2D165B', '#E9D5FF')

    # =========================================================================
    # 3. SUBSYSTEM 3: CENTRAL COORDINATION SERVER (NODE.JS / EXPRESS / SOCKET.IO)
    # [x: 9.1, y: 1.1, w: 7.8, h: 5.9]
    # =========================================================================
    draw_container(9.1, 1.1, 7.8, 5.9, "3. CENTRAL COORDINATION SERVER (NODE.JS / EXPRESS / WS)", C_BE_BORDER, C_BE_BG, "Cloud Server")

    draw_card(9.3, 5.0, 7.4, 1.4, "RESTFUL INGESTION & AUTHENTICATION ROUTERS (:5000)",
              ["• POST /api/telemetry: Ingests ESP32 JSON payload (speed, lat/lon, IMU, MQ3) every 3 seconds",
               "• POST /api/ai/prediction: Ingests edge AI state & confidence; initiates crash workflows",
               "• POST /api/rfid/authenticate: Authenticates card UID, generates JWT session, clears on timeout",
               "• POST /api/emergency/cancel & dispatch: Manages pending false-alarm countdown lifecycle"],
              '#10B981', '#083B2F', '#6EE7B7')

    draw_card(9.3, 3.1, 7.4, 1.75, "CORE SYSTEM LOGIC & EMERGENCY ORCHESTRATION ENGINES",
              ["• Hardware Connection Watchdog: Flags ESP32 offline at 5.5s packet loss; auto logouts at 20s",
               "• Multi-GNSS & Geocoding Service: Verifies satellite fixes, queries OpenStreetMap Nominatim",
               "   for human-readable place names, falls back to Wi-Fi BSSID AP triangulation",
               "• Emergency Decision Controller: Dual-trigger evaluation (Accel > 25G OR Vision Crash/Unresponsive),",
               "   2-second debounce suppression window, coordinates 10-second cancelable SOS countdown"],
              '#059669', '#083B2F', '#A7F3D0')

    draw_card(9.3, 1.35, 7.4, 1.6, "BIDIRECTIONAL REAL-TIME SOCKET.IO ENGINE",
              ["• Sub-10ms Event-Driven WebSocket Server Broadcasting to Connected React Clients:",
               "   - telemetry_update: Real-time sensor values, speed, coordinates, alcohol reading",
               "   - ai_prediction: Live event state, risk classification, and probability confidence",
               "   - emergency_pending: Triggers 10s interactive SOS modal with video preview",
               "   - emergency_dispatched, emergency_cancelled, esp32_status, login_status"],
              '#10B981', '#083B2F', '#6EE7B7')

    # =========================================================================
    # 4. SUBSYSTEM 4: CLOUD PERSISTENCE & THIRD-PARTY SAFETY GATEWAYS
    # [x: 17.6, y: 7.4, w: 7.8, h: 7.5]
    # =========================================================================
    draw_container(17.6, 7.4, 7.8, 7.5, "4. CLOUD PERSISTENCE & SAFETY DISPATCH GATEWAYS", C_CL_BORDER, C_CL_BG, "Cloud Gateways")

    draw_card(17.8, 12.5, 7.4, 1.6, "MONGODB ATLAS CLOUD PERSISTENCE (M0 TLS)",
              ["• Telemetry Collection: Complete historical time-series sensor packets from ESP32",
               "• AIPredictions Collection: Event classifications, risk strata, confidence scores",
               "• Emergencies Collection: Crash incident audits, verified GPS locations, dispatch status",
               "• Sessions & RfidCards Collections: Active login tokens and authorized card registry"],
              '#F43F5E', '#3D0E19', '#FECDD3')

    draw_card(17.8, 10.6, 7.4, 1.7, "TWILIO PROGRAMMABLE SMS API GATEWAY",
              ["• Protocol: Outbound HTTPS REST API Call to Twilio Cloud",
               "• Recipient: Designated Emergency Family Guardian Phone (+91 8431712890)",
               "• Automated High-Priority Alert Message Payload:",
               "   - Rider Identity: Sahana | Status: Crash Detected / Unresponsive Driver",
               "   - Geocoded Place Name & Speed at Impact  |  Exact Google Maps Deep Link Pin",
               "   - Direct Playable Cloud URL to 10-Second Incident Black Box Video Clip"],
              '#E11D48', '#3D0E19', '#FFE4E6')

    draw_card(17.8, 8.8, 7.4, 1.6, "NTFY.SH GLOBAL REAL-TIME PUSH GATEWAY",
              ["• Protocol: HTTPS POST /topic with urgent priority and custom action tags",
               "• Instant Push Notification to Family Smartphone (NTFY App / Browser)",
               "• Features: Audible emergency siren, click-to-open Google Maps navigation pin,",
               "   and direct media attachment preview of the 10-second accident video"],
              '#F43F5E', '#3D0E19', '#FECDD3')

    draw_card(17.8, 7.6, 7.4, 1.0, "CLOUD INCIDENT VIDEO HOSTING CDN (UGUU / TMPFILES)",
              ["• Zero-configuration temporary cloud hosting of accident video clips (MP4 format)",
               "• Provides instant public CDN URLs accessible on all iOS, Android, and desktop browsers"],
              '#FB7185', '#3D0E19', '#FFE4E6')

    # =========================================================================
    # 5. SUBSYSTEM 5: REACT LIVE TELEMETRY DASHBOARD (SPA :5173)
    # [x: 17.6, y: 1.1, w: 7.8, h: 5.9]
    # =========================================================================
    draw_container(17.6, 1.1, 7.8, 5.9, "5. REACT 19 LIVE TELEMETRY DASHBOARD & HUD", C_FE_BORDER, C_FE_BG, "Client Interface")

    draw_card(17.8, 5.1, 7.4, 1.3, "LIVE INTERACTIVE SENSOR HUD & GPS MAPPING",
              ["• Leaflet.js / React-Leaflet Map: Dynamic dark-mode map with real-time GPS pin tracking",
               "• Recharts Telemetry Charts: Rolling historical trends for Speed, Accel G-Force, and MQ-3",
               "• Live Device Health Status: Real-time indicators for ESP32, GPS Lock, and Wi-Fi latency"],
              '#06B6D4', '#0A2D3C', '#A5F3FC')

    draw_card(17.8, 3.4, 7.4, 1.5, "AI VISION STREAM HUD & DROWSINESS INDICATOR",
              ["• Embedded FastAPI MJPEG Camera Feed with dynamic YOLOv8 & Lane Departure overlays",
               "• Real-time Drowsiness Status Card: Displays Eye Aspect Ratio (EAR) gauge and closure alert",
               "• AI Prediction Badge: Displays live Random Forest event state and model confidence %"],
              '#0891B2', '#0A2D3C', '#CFFAFE')

    draw_card(17.8, 1.35, 7.4, 1.9, "INTERACTIVE IMPACT EMERGENCY SOS MODAL",
              ["• High-Priority Audio-Visual Alarm triggered upon Crash or >10s Unresponsiveness",
               "• 10-Second Visual Circular Countdown with Pulse Animation (Framer Motion)",
               "• Video Black Box Incident Preview: Plays the recorded 10-second crash clip",
               "• Dual Safety Action Controls:",
               "   - 'CANCEL (FALSE ALARM)': Aborts dispatch if rider is uninjured (speed bump / drop)",
               "   - 'CONFIRM / CALL NOW': Immediately bypasses countdown and fires emergency SOS"],
              '#06B6D4', '#0A2D3C', '#A5F3FC')

    # =========================================================================
    # 6. SUBSYSTEM 6: BYSTANDER EMERGENCY LIFELINE & QR PORTAL
    # [x: 0.6, y: 1.1, w: 7.8, h: 5.9]
    # =========================================================================
    draw_container(0.6, 1.1, 7.8, 5.9, "6. BYSTANDER EMERGENCY LIFELINE & HELMET QR PORTAL", C_QR_BORDER, C_QR_BG, "Zero-App Lifeline")

    draw_card(0.8, 5.1, 7.4, 1.3, "PHYSICAL HELMET QR DECALS (ISO/IEC 18004 COMPLIANT)",
              ["• Dual Weatherproof High-Contrast Vinyl Stickers placed on Helmet Brow & Nape",
               "• Enables Any Bystander or Paramedic to Scan using Standard Smartphone Camera",
               "• Zero App Installation, Zero Account Setup, Zero Login Barrier (Static GitHub Pages)"],
              '#F59E0B', '#381C06', '#FDE68A')

    draw_card(0.8, 3.2, 7.4, 1.7, "INSTANT CRITICAL MEDICAL & IDENTITY INFORMATION",
              ["• High-Visibility Medical Card: Rider Name (Sahana)  |  Blood Group (A+ Urgent)",
               "• Vehicle Registration: Honda Activa KA 28 HM 8281  |  Home Address: Koppal, Karnataka",
               "• Medical Condition & Allergy Alerts for Emergency Medical Responders",
               "• Witness Check-In Module: Collects Good Samaritan Name, Phone, and HTML5 GPS Location"],
              '#D97706', '#381C06', '#FEF3C7')

    draw_card(0.8, 1.35, 7.4, 1.65, "ONE-TAP DIRECT ASSISTANCE & LEGAL IMMUNITY",
              ["• One-Tap Urgent WhatsApp Alert: Formatted message with GPS pin link sent to family",
               "• Direct Family Call Button: Instantly dials Guardian Phone (+91 8431712890)",
               "• One-Click State EMS Hotlines: Direct dials 108 (Ambulance) / 112 (National Emergency)",
               "• Good Samaritan Notice: Highlights Section 134A Motor Vehicles Act Legal Immunity"],
              '#F59E0B', '#381C06', '#FDE68A')

    # =========================================================================
    # 7. INTER-SUBSYSTEM CONNECTION ARROWS & PROTOCOL LABELS
    # =========================================================================

    # Arrow 1: ESP32 to Node.js Backend (Telemetry POST)
    ax.annotate('', xy=(9.1, 5.8), xytext=(8.4, 11.5),
                arrowprops=dict(arrowstyle="->", color='#38BDF8', lw=2.6,
                                connectionstyle="arc3,rad=-0.16"))
    ax.text(8.75, 8.6, "HTTP POST /api/telemetry (Every 3s)\nWi-Fi 802.11 b/g/n [JSON Payload]",
            ha='center', va='center', fontsize=7.8, fontweight='bold', color='#38BDF8',
            bbox=dict(boxstyle="round,pad=0.2", fc='#0B1120', ec='#38BDF8', lw=1, alpha=0.95))

    # Arrow 2: Backend Telemetry to AI Fusion Engine (Polling GET)
    ax.annotate('', xy=(12.0, 9.1), xytext=(12.0, 6.5),
                arrowprops=dict(arrowstyle="->", color='#A855F7', lw=2.2, linestyle='--'))
    ax.text(12.0, 7.7, "HTTP GET /api/telemetry\n(10 Hz Telemetry Polling)",
            ha='center', va='center', fontsize=7.5, fontweight='bold', color='#C084FC',
            bbox=dict(boxstyle="round,pad=0.15", fc='#0B1120', ec='#A855F7', lw=1, alpha=0.9))

    # Arrow 3: AI Predictions to Backend (Prediction POST)
    ax.annotate('', xy=(14.5, 6.5), xytext=(14.5, 7.7),
                arrowprops=dict(arrowstyle="->", color='#A855F7', lw=2.5))
    ax.text(14.5, 7.1, "HTTP POST /api/ai/prediction (20 Hz)\n[Event, Risk Level, Confidence %]",
            ha='center', va='center', fontsize=7.5, fontweight='bold', color='#E9D5FF',
            bbox=dict(boxstyle="round,pad=0.15", fc='#0B1120', ec='#A855F7', lw=1, alpha=0.9))

    # Arrow 4: Backend to React Dashboard (Socket.IO WebSockets)
    ax.annotate('', xy=(17.6, 4.0), xytext=(16.9, 4.0),
                arrowprops=dict(arrowstyle="->", color='#10B981', lw=3.0))
    ax.text(17.25, 4.5, "Socket.IO Real-Time Stream\ntelemetry_update, ai_prediction,\nemergency_pending (10s SOS)",
            ha='center', va='center', fontsize=7.8, fontweight='bold', color='#6EE7B7',
            bbox=dict(boxstyle="round,pad=0.2", fc='#0B1120', ec='#10B981', lw=1, alpha=0.95))

    # Arrow 5: Backend to MongoDB Atlas
    ax.annotate('', xy=(17.6, 13.0), xytext=(16.9, 6.0),
                arrowprops=dict(arrowstyle="->", color='#F43F5E', lw=2.5,
                                connectionstyle="arc3,rad=-0.12"))
    ax.text(17.25, 10.0, "Mongoose ODM (TLS / Port 27017)\nStore Telemetry, AI Predictions,\nEmergency Logs & RFID Sessions",
            ha='center', va='center', fontsize=7.5, fontweight='bold', color='#FECDD3',
            bbox=dict(boxstyle="round,pad=0.2", fc='#0B1120', ec='#F43F5E', lw=1, alpha=0.95))

    # Arrow 6: Backend Emergency Controller to Twilio & NTFY
    ax.annotate('', xy=(17.8, 11.2), xytext=(16.9, 3.5),
                arrowprops=dict(arrowstyle="->", color='#F43F5E', lw=2.5,
                                connectionstyle="arc3,rad=-0.22"))
    ax.text(17.3, 8.0, "HTTPS Outbound REST APIs\nTwilio SMS + NTFY.SH Push\n(10s Timer Expiry / Confirm)",
            ha='center', va='center', fontsize=7.5, fontweight='bold', color='#FDA4AF',
            bbox=dict(boxstyle="round,pad=0.2", fc='#0B1120', ec='#F43F5E', lw=1, alpha=0.95))

    # Arrow 7: AI Black Box to Cloud CDN
    ax.annotate('', xy=(17.8, 8.0), xytext=(16.9, 8.0),
                arrowprops=dict(arrowstyle="->", color='#A855F7', lw=2.2))
    ax.text(17.35, 8.35, "Upload 10s Clip (MP4)",
            ha='center', va='center', fontsize=7.2, fontweight='bold', color='#E9D5FF',
            bbox=dict(boxstyle="round,pad=0.15", fc='#0B1120', ec='#A855F7', lw=1, alpha=0.9))

    # Arrow 8: AI Video Stream to React Dashboard HUD
    ax.annotate('', xy=(19.0, 4.9), xytext=(16.7, 7.7),
                arrowprops=dict(arrowstyle="->", color='#06B6D4', lw=2.0, linestyle=':',
                                connectionstyle="arc3,rad=-0.15"))
    ax.text(18.0, 6.3, "FastAPI MJPEG Stream\n(:8000/video_feed)",
            ha='center', va='center', fontsize=7.2, fontweight='bold', color='#A5F3FC',
            bbox=dict(boxstyle="round,pad=0.15", fc='#0B1120', ec='#06B6D4', lw=1, alpha=0.9))

    # =========================================================================
    # 8. MASTER LEGEND / KEY BANNER AT BOTTOM
    # =========================================================================
    leg_box = patches.FancyBboxPatch((0.6, 0.2), 24.8, 0.65, boxstyle="round,pad=0.06",
                                     fc='#111C30', ec='#334155', lw=1.2, zorder=10)
    ax.add_patch(leg_box)
    
    legend_items = [
        ("[#] Embedded Hardware (ESP32)", '#38BDF8'),
        ("[#] Edge AI & Vision Node", '#A855F7'),
        ("[#] Central Node.js Server", '#10B981'),
        ("[#] Cloud DB & Alert Gateways", '#F43F5E'),
        ("[#] React Live Dashboard HUD", '#06B6D4'),
        ("[#] Bystander QR Lifeline", '#F59E0B'),
        ("--> Direct Network Flow", '#E2E8F0'),
        ("- - Polling Stream", '#94A3B8'),
    ]
    curr_lx = 1.0
    for text, col in legend_items:
        ax.text(curr_lx, 0.52, text, ha='left', va='center', fontsize=8.2, fontweight='bold', color=col, zorder=11)
        curr_lx += 3.0

    # Save master diagram
    plt.tight_layout()
    plt.savefig(out_path, dpi=300, facecolor=fig.get_facecolor(), edgecolor='none')
    plt.close()
    print(f"Successfully generated master block diagram at: {out_path}")
    
    # Also copy to artifact directory for instant viewing
    os.makedirs(artifact_dir, exist_ok=True)
    shutil.copy2(out_path, artifact_img_path)
    print(f"Copied master block diagram to artifact path: {artifact_img_path}")

if __name__ == '__main__':
    generate_master_block_diagram()
