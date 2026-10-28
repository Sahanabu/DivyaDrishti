import docx
from docx.shared import Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

SRC_PATH = r"C:\Users\ratan\Desktop\DivyaDrishti\03_KSCST_SPP_50S_Proposal_Format_2026-27.docx"
OUT_PATH = r"C:\Users\ratan\Desktop\DivyaDrishti\03_KSCST_SPP_50S_Proposal_Format_2026-27_Updated.docx"

doc = docx.Document(SRC_PATH)

def replace_cell_paragraphs(cell, text_list, keep_nested_tables=True):
    """
    Clears all paragraphs in the cell and populates with new text_list.
    Preserves nested tables if keep_nested_tables=True.
    """
    p0 = cell.paragraphs[0]
    p0.text = ""
    for p in list(cell.paragraphs[1:]):
        p._p.getparent().remove(p._p)
        
    for i, line in enumerate(text_list):
        p = cell.add_paragraph() if i > 0 else p0
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.line_spacing = 1.15
        
        is_bold_header = any(line.startswith(h) for h in [
            "Background and Need", "Review of Existing Work", "Problem Statement", 
            "Objectives", "Innovation / Novelty", "1. WHAT IS NEW", "2. HOW IS IT DIFFERENT", "3. WHY IS IT INNOVATIVE",
            "1. EXISTING TECHNOLOGIES", "2. COMMERCIAL PRODUCTS", "3. RESEARCH PAPERS", "4. PATENTS", "5. EXISTING SOLUTIONS",
            "TECHNICAL", "SOCIAL", "ENVIRONMENTAL", "ECONOMIC", "INDUSTRIAL", "ACADEMIC", "POTENTIAL USERS",
            "Expected Deliverables", "Expected Outcomes", "Relevance", "Major Requirements", "References",
            "1. HARDWARE", "2. SOFTWARE", "3. CONSUMABLES", "4. FIELD STUDIES"
        ])
        
        r = p.add_run(line)
        r.font.name = "Arial" if is_bold_header else "Times New Roman"
        r.font.size = Pt(10)
        if is_bold_header:
            r.bold = True

print("Step 1: Updating Table 0, Row 2 (Keywords)...")
t0 = doc.tables[0]
t0.rows[2].cells[1].text = "Keywords (5–8): ARTIFICIAL INTELLIGENCE, INTERNET OF THINGS (IOT), SMART HELMET, COMPUTER VISION, DRIVER DROWSINESS DETECTION, LANE DEPARTURE DETECTION, SENSOR FUSION, EMERGENCY RESPONSE"
for p in t0.rows[2].cells[1].paragraphs:
    for r in p.runs:
        r.font.name = "Times New Roman"
        r.font.size = Pt(10)

t3 = doc.tables[3]

print("Step 2: Updating Row 1 (Background and Need of the Project)...")
row1_text = [
    "Background and Need of the Project:",
    "1. Background: Motorized two-wheelers represent the primary mode of personal transport in India, accounting for over 70% of total vehicular volume. According to the official Ministry of Road Transport and Highways (MoRTH) report Road Accidents in India 2022 (published October 2023), motorized two-wheelers accounted for the highest share of road accident fatalities nationwide, representing 44.5% of all deaths (74,897 lives lost out of 168,491 total fatalities) [1]. The World Health Organization (WHO) identifies operator fatigue, delayed hazard response, alcohol impairment, and delayed medical assistance during the \"Golden Hour\" as primary factors exacerbating two-wheeler fatalities [2].",
    "2. Existing Scenario: Conventional motorcycle helmets primarily provide passive mechanical protection against cranial impacts, but generally lack active sensing, driver alertness monitoring, and automated emergency notification capabilities. Commercial solutions incorporating smart features typically isolate single functions—such as basic cellular hands-free audio or standalone impact-activated beacons—without analyzing the rider's physiological alertness or the surrounding road scene. Furthermore, when accidents occur in isolated corridors, emergency medical services and family members often experience prolonged response delays.",
    "3. Problem Statement: Motorcycle riders face heightened vulnerability to road accidents caused by driver fatigue, delayed reactions, unintended lane departure, alcohol presence, and high-energy collisions. The absence of an integrated, real-time safety system delays accident identification, precise location sharing, and emergency awareness.",
    "4. Need for the Project: DivyaDrishti addresses this critical safety challenge by developing an integrated IoT and edge-computing safety architecture. By combining on-helmet embedded sensing (ESP32) with computer vision on an edge computing node, the system continuously monitors rider alertness and movement telemetry, issuing local warnings and dispatching automated notifications with GPS coordinates and short incident video footage to designated family contacts during potential emergencies.",
    "5. Beneficiaries: The primary beneficiaries are motorcycle and scooter riders, daily commuters, student riders, delivery personnel, and long-distance travelers. Designated family contacts benefit from timely location-linked emergency notifications, while emergency responders and bystanders on-scene benefit from instantaneous access to the rider's medical profile and emergency contacts via the helmet-mounted QR code."
]
replace_cell_paragraphs(t3.rows[1].cells[1], row1_text)

print("Step 3: Updating Row 2 (Review of Existing Work)...")
row2_text = [
    "Review of Existing Work:",
    "1. EXISTING TECHNOLOGIES",
    "Research in intelligent motorcycle safety centers on embedded telematics and computer vision. Embedded systems incorporating accelerometers, gyroscopes, GPS, and communication modules have demonstrated threshold-based accident detection and location reporting [3]. Concurrently, computer vision systems utilizing facial landmark tracking (Eye Aspect Ratio—EAR) enable non-intrusive fatigue monitoring [5]. However, existing academic literature highlights significant challenges in power consumption, false alarms, and the lack of unified multi-sensor fusion combining physiological states with vehicle dynamics [3], [4].",
    "2. COMMERCIAL PRODUCTS",
    "Commercial products such as the Forcite smart helmet platform and Livall connected helmets demonstrate the feasibility of integrating electronics into protective headgear for communication and navigation. However, these proprietary systems remain cost-prohibitive for mass adoption in developing regions, rarely integrate front-facing road obstacle detection with driver eye monitoring, and lack open incident-video context for emergency contacts.",
    "3. RESEARCH PAPERS",
    "The following research works form the academic foundation for this project:",
    "• Applications of Smart Helmet in Applied Sciences: A Systematic Review (2021) by Y. Choi and Y. Kim systematically reviewed smart helmet applications (2009–2020), showing that modular single-board microcontrollers dominate research prototypes, but real-world reliability is hindered by power constraints and false impact alerts [3].",
    "• Trends in Smart Helmets With Multimodal Sensing for Health and Safety: Scoping Review (2022) by P. Lee et al. examined wearable helmet sensors, finding that isolated accelerometer thresholds produce significant false alarms during routine helmet handling unless validated against secondary motion or physiological indicators [4].",
    "• Technologies for Detecting and Monitoring Drivers' States: A Systematic Review (2024) by M. S. Al-Quraishi et al. evaluated sensor- and vision-based approaches, identifying camera-based facial landmark tracking as a reliable non-intrusive method for detecting fatigue through eye-closure duration [5].",
    "• Real-Time Eye Blink Detection using Facial Landmarks (2016) by T. Soukupová and J. Čech established real-time facial landmark geometry for calculating Eye Aspect Ratio (EAR) and detecting blink frequency [6].",
    "• Random Forests (2001) by L. Breiman established the mathematical foundation for Random Forest ensemble classification, demonstrating high resilience to noisy multi-sensor telemetry [7].",
    "4. PATENTS",
    "The international patent Integrated Smart Helmet and Methods and Systems of Controlling Smart Helmet (WO2020217089A1, inventor: Anirudha Surabhi Venkata Jagannadha Rao) discloses crash detection using IMU sensors, location-based emergency notifications, and blind-spot indication [10]. Existing patents focus heavily on specific hardware packaging, leaving open opportunities for distributed architectures that fuse embedded sensor telemetry with edge computer vision.",
    "5. EXISTING SOLUTIONS, SHORTCOMINGS AND RESEARCH GAPS",
    "Existing solutions generally focus on individual functions, such as crash detection, GPS tracking, alcohol sensing, or emergency messaging. Important challenges include false crash alerts, high hardware costs, power constraints, and lack of visual contextual evidence.",
    "Research gap: Existing prototypes present three main gaps: (a) absence of coordinated fusion between rider alertness (EAR) and vehicle motion dynamics (acceleration, pitch, roll); (b) high rates of unverified false-positive emergency alerts; and (c) absence of visual incident context and rapid medical profile access for first responders. DivyaDrishti addresses these challenges through a modular ESP32-to-laptop edge pipeline, an interactive 10-second cancelable SOS countdown, automated video black-box clip generation, and a power-independent printed QR emergency medical profile."
]
replace_cell_paragraphs(t3.rows[2].cells[1], row2_text)

print("Step 4: Updating Row 3 (Problem Statement)...")
row3_text = [
    "Problem Statement:",
    "Motorcycle riders face severe risks from operator fatigue, lane deviation, alcohol presence, and high-energy collisions. Existing protective equipment remains purely passive, while available research prototypes address isolated sensing functions that suffer from frequent false alarms, high fabrication costs, and an inability to deliver immediate visual or medical context to family contacts and first responders.",
    "DivyaDrishti addresses this problem by implementing a distributed AIoT safety architecture that integrates: (1) low-latency ESP32 embedded telemetry, (2) computer-vision-based drowsiness and lane monitoring, (3) Random Forest multi-sensor classification, and (4) an emergency notification mechanism featuring a 10-second cancelable window, automated incident-video clip generation, and a power-independent printed QR code that links to an online emergency information portal (access to the portal requires network connectivity and continued hosting).",
    "The primary engineering challenge is to achieve reliable detection, low response latency, and false-positive alert mitigation under practical operating constraints."
]
replace_cell_paragraphs(t3.rows[3].cells[1], row3_text)

print("Step 5: Updating Row 4 (Objectives)...")
row4_text = [
    "Objectives:",
    "● To maintain and refine the distributed AIoT prototype architecture, interfacing an ESP32 helmet unit (MPU6050 IMU, Quectel L86-M33 GPS, MQ-3 gas sensor, MFRC522 RFID, SH1106 OLED, buzzer) with a companion edge computing node running YOLOv8n object detection, polynomial lane tracking, and MediaPipe facial landmark analysis.",
    "● To collect and label data from controlled sensor tests, stationary rider-facing video sessions, and prerecorded road-scene footage. The existing models will be evaluated on appropriate independent test sets, and retraining will be undertaken if sufficient labelled data is available.",
    "● To implement and benchmark real-time road-object detection using YOLOv8n to identify relevant road users (cars, pedestrians, motorcycles, buses, trucks) and evaluate detection performance using precision, recall, and inference latency.",
    "● To characterize false-alert rates and calibrate active thresholds, evaluating the firmware impact threshold (25.0 m/s² ≈ 2.55 g), the edge AI impact baseline (4.8 g), the raw MQ-3 baseline, and eye-closure duration thresholds (2.0 s for drowsiness, 10.0 s for unresponsiveness) under controlled non-hazardous disturbances.",
    "● To validate the automated emergency notification workflow, evaluating the end-to-end reliability of the 10-second cancelable SOS interface, Twilio SMS delivery, NTFY.SH push notifications, 10-second H.264 video black-box export, and QR-based emergency portal access.",
    "● To evaluate system performance across end-to-end response latency, notification delivery success, video encoding delay, power consumption, and overall implementation cost under controlled, non-hazardous test conditions."
]
replace_cell_paragraphs(t3.rows[4].cells[1], row4_text)

print("Step 6: Updating Row 5 (Innovation / Novelty)...")
row5_text = [
    "Innovation / Novelty:",
    "1. WHAT IS NEW?",
    "DivyaDrishti implements an edge-to-cloud framework that pairs localized microcontroller sensing on the helmet with computer vision on an edge node to support proactive hazard warnings and post-incident response. Specific features include a rolling 250-frame circular video buffer that automatically exports a 10-second H.264 incident clip upon emergency detection, and a power-independent printed QR code attached to the helmet that links to an online emergency information portal. The printed decal requires no helmet battery power, though accessing the portal requires cellular connectivity and active hosting.",
    "2. HOW IS IT DIFFERENT FROM EXISTING WORK?",
    "While typical research prototypes isolate sensing to a single microcontroller or an in-cabin dashcam, DivyaDrishti synchronizes vehicle motion dynamics (MPU6050 acceleration, pitch, roll, gyro rates) with vision-derived metrics (bi-ocular EAR, blink rate, lateral lane deviation, obstacle distance proxies) into a 12-dimensional feature vector. To mitigate false dispatches caused by minor drops or rough handling, the system allows the rider to cancel suspected false alarms during a 10-second countdown on the dashboard accompanied by acoustic alerts, providing an opportunity to dismiss non-injury events before messages are dispatched.",
    "3. WHY IS IT INNOVATIVE?",
    "The approach emphasizes practical, cost-conscious engineering. Rather than placing heavy, power-intensive single-board computers inside the helmet shell, the system utilizes a lightweight, low-power ESP32 on the helmet tethered over local Wi-Fi to an edge device (laptop/PC). Offloading heavy vision computing to an external laptop reduces onboard hardware bulk and payload, though physical testing is required to assess the structural impact of external sensor enclosures."
]
replace_cell_paragraphs(t3.rows[5].cells[1], row5_text)

print("Step 7: Updating Row 6 (Methodology) while strictly preserving images at p7 and p9...")
c6 = t3.rows[6].cells[1]

# Text before images (indices 0 to 5)
pre_img_text = [
    "Proposed Methodology:",
    "1. OVERALL METHODOLOGY",
    "The proposed DivyaDrishti system follows a modular, four-layer architecture integrating embedded hardware, artificial intelligence, backend services, and a real-time monitoring dashboard.",
    "Initially, an ESP32 microcontroller collects sensor data from the MPU6050 inertial measurement unit (IMU), Quectel L86-M33 GPS module, MQ-3 gas sensor, and MFRC522 RFID reader. Rider authentication and safety status are displayed locally on an SH1106 OLED, with a buzzer generating acoustic warnings. The ESP32 transmits sensor telemetry to the backend through Wi-Fi.",
    "Simultaneously, a camera connected to an edge node (laptop) supplies video frames to a Python-based AI pipeline. In the current physical prototype, the software pipeline (ai/main.py) captures a single video stream via cv2.VideoCapture (evaluated individually with a webcam facing the rider for EAR analysis or facing pre-recorded road footage for lane/object analysis; simultaneous dual-view was evaluated via the synthetic driving simulator harness). Ultralytics YOLOv8n detects road obstacles, polynomial lane detection analyses lane boundaries, and MediaPipe facial landmarking computes Eye Aspect Ratio (EAR) for drowsiness monitoring.",
    "The extracted visual features are combined with hardware telemetry to form a 12-dimensional feature vector classified by Scikit-Learn Random Forest models for driving-event identification and risk estimation. The Node.js backend persists records in MongoDB Atlas and streams live updates to the React dashboard over Socket.IO. When an emergency condition confirms, the system executes a 10-second cancelable SOS countdown and dispatches GPS-linked SMS and push notifications to emergency contacts."
]

for idx, txt in enumerate(pre_img_text):
    c6.paragraphs[idx].text = txt
    for r in c6.paragraphs[idx].runs:
        r.font.name = "Arial" if idx in [0, 1] else "Times New Roman"
        r.font.size = Pt(10)
        if idx in [0, 1]: r.bold = True

# Leave p6 ('2. BLOCK DIAGRAM / FLOW CHART'), p7 (image1.png), p8 ('3. SYSTEM ARCHITECTURE'), p9 (image3.png) intact!

# Delete paragraphs from p10 to the end
for p in list(c6.paragraphs[10:]):
    p._p.getparent().remove(p._p)

post_img_text = [
    "The system consists of four layers:",
    "Layer 1 – Hardware and Embedded System: An ESP32-based helmet unit interfaces with the MPU6050, Quectel L86-M33 GPS, MQ-3 alcohol sensor, MFRC522 RFID reader, SH1106 OLED, and piezoelectric buzzer. Arduino C++ firmware executes non-blocking sensor sampling, evaluates the 25.0 m/s² (≈ 2.55 g) impact threshold, manages rider authentication sessions, renders local status screens, and transmits JSON telemetry via HTTP POST over Wi-Fi.",
    "Layer 2 – AI and Computer Vision: A Python-based edge-computing pipeline runs on a laptop and processes video frames. YOLOv8n identifies safety-relevant road objects, HLS and Sobel-based polynomial lane detection analyses lateral deviation, and MediaPipe calculates eye-related features for drowsiness monitoring. Sensor and vision features are combined into a 12-dimensional vector and classified by Random Forest models. FastAPI provides the video-streaming and incident-clip export interfaces.",
    "Layer 3 – Backend and Database: Node.js and Express manage incoming sensor telemetry, AI predictions, authentication sessions, and emergency events. Socket.IO broadcasts real-time updates, while MongoDB Atlas stores telemetry readings, predictions, session information, and emergency logs. A connection watchdog monitors helmet connectivity heartbeats.",
    "Layer 4 – Dashboard and Emergency Response: A React-based dashboard displays GPS location using Leaflet, historical telemetry using Recharts, live camera footage, rider status, and AI predictions. The emergency module provides an acoustic 10-second cancelable SOS countdown and integrates Twilio SMS and NTFY.SH push notifications with GPS coordinates and incident-video links. A power-independent printed QR code on the helmet links to an online emergency portal (emergency-portal/index.html); accessing this profile requires cellular network access and active server hosting.",
    "4. DESIGN APPROACH",
    "The design follows a modular, incremental engineering approach:",
    "Hardware development: Interface sensors with the ESP32, implement non-blocking firmware tasks, verify MPU6050 motion readings, GPS coordinate acquisition, RFID authentication, OLED rendering, and buzzer alarms.",
    "AI module development: Benchmark YOLOv8n object detection, polynomial lane tracking under HLS/Sobel gradient filtering, and MediaPipe-based drowsiness tracking via bi-ocular EAR.",
    "Machine-learning integration: Combine visual and telematic features into a 12-dimensional vector. Benchmark Random Forest models using the synthetic driving dataset described in the report, and prepare data pipelines for empirical retraining.",
    "Backend and dashboard development: Integrate telemetry ingestion and AI prediction logging via REST APIs, persist data in MongoDB Atlas, and stream live telematic metrics to the React dashboard over Socket.IO.",
    "Emergency-response integration: Configure crash and prolonged eye-closure triggers, the 10-second cancelable SOS countdown, incident-video clip export, and Twilio SMS / NTFY.SH notifications containing GPS location links.",
    "System integration: Validate end-to-end communication across hardware, edge AI, backend, and dashboard before conducting safe, controlled experimental evaluations.",
    "5. EXPERIMENTAL PLAN",
    "The prototype will be evaluated through safe, controlled, consent-based testing protocols:",
    "Safety & Ethics Protocol: Testing will strictly avoid hazardous public-road driving. Drowsiness detection will be evaluated on stationary seated volunteers. Road-scene analysis will use recorded dashcam video or low-speed closed tracks. Impact detection testing will be conducted on isolated sensor enclosures or test fixtures; no certified road helmets will have their protective EPS liners modified, drilled, or damaged.",
    "Data Privacy Protocol: During testing and demonstrations, only synthetic dummy medical profiles, simulated phone numbers, and non-sensitive video clips will be used. Public temporary file hosts will not be used for real identifiable rider data.",
    "Hardware testing: Verify MPU6050 communication, Quectel L86 GPS fix time under open-sky conditions, raw MQ-3 baseline voltage, RFID card verification, OLED display cycling, and buzzer operation.",
    "Object-detection testing: Evaluate YOLOv8n using labelled images and video clips containing vehicles, motorcycles, and pedestrians. Measure precision, recall, and inference frame rate.",
    "Lane-detection testing: Use recorded road videos under varied lighting (day, dusk, artificial streetlights) to evaluate lane identification, deviation tracking, and warning reliability.",
    "Drowsiness testing: Test the MediaPipe-based module using voluntary blinking and eye-closure scenarios on seated participants. Measure EAR threshold response and classification accuracy.",
    "Machine-learning evaluation: The current models were trained and benchmarked on a 10,000-sample synthetic dataset. Independent test evaluations and retraining will be conducted as empirical sensor and video data are collected.",
    "Integration testing: Verify communication latency between the ESP32, AI edge node, Node.js backend, MongoDB Atlas, and React dashboard.",
    "Emergency-response testing: Simulate crash events (accel > 25.0 m/s²) and prolonged eye closure (duration > 10 s) under controlled conditions. Measure cancelation response times, SMS delivery success, and video export delays.",
    "Performance assessment: Measure video processing frame rate, end-to-end notification latency, power consumption, and overall prototype bill-of-materials cost.",
    "6. SOFTWARE AND HARDWARE TO BE USED",
    "Hardware",
    "ESP32 WROOM-32 development board – embedded processing and Wi-Fi communication.",
    "MPU6050 six-axis IMU – acceleration, angular motion, and impact-related measurements.",
    "Quectel L86-M33 GPS module – geographical location tracking.",
    "MQ-3 gas sensor – analog alcohol-related sensor readings.",
    "MFRC522 RFID reader and compatible cards – rider authentication.",
    "SH1106 1.3-inch OLED display – rider and system-status information.",
    "Piezoelectric buzzer – audible safety warnings.",
    "USB webcam or compatible camera – real-time video acquisition.",
    "Laptop with a suitable processor, memory, and camera interface – AI edge processing and application hosting.",
    "Regulated power supply, connecting wires, non-destructive helmet mounting arrangements, and supporting electronic components.",
    "Software, Frameworks, and Libraries",
    "Embedded firmware: Arduino IDE, ESP32 Arduino Core, Arduino C++, ArduinoJson, TinyGPSPlus, MFRC522, and Adafruit SH110X.",
    "Computer vision and AI: Python, OpenCV, Ultralytics YOLOv8n, MediaPipe, NumPy, and scikit-learn.",
    "AI server: FastAPI and Uvicorn for API services and video streaming.",
    "Backend: Node.js, Express.js, and Socket.IO.",
    "Database: MongoDB Atlas for telemetry, predictions, session records, and emergency logs.",
    "Frontend: React.js, Leaflet, React-Leaflet, Recharts, and Tailwind CSS.",
    "Emergency communication: Twilio SMS, NTFY.SH push notifications, GPS-based map links, and incident-video export.",
    "Communication protocols: I²C for compatible sensors, UART for GPS, SPI for RFID, HTTP/REST for telemetry and predictions, and Socket.IO for real-time dashboard updates.",
    "The system will be evaluated using a combination of embedded hardware tests, AI performance measurements, integration tests, and controlled simulations to assess feasibility, reliability, and suitability for further improvement."
]

for txt in post_img_text:
    p = c6.add_paragraph()
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.line_spacing = 1.15
    is_bold_header = any(txt.startswith(h) for h in [
        "4. DESIGN APPROACH", "5. EXPERIMENTAL PLAN", "6. SOFTWARE AND HARDWARE", "Hardware", "Software, Frameworks"
    ])
    r = p.add_run(txt)
    r.font.name = "Arial" if is_bold_header else "Times New Roman"
    r.font.size = Pt(10)
    if is_bold_header: r.bold = True

print("Step 8: Updating Row 7 (Expected Deliverables)...")
row7_text = [
    "Expected Deliverables:",
    "● Working Smart Helmet Hardware Prototype: An ESP32-based helmet unit integrating MPU6050 6-axis IMU, Quectel L86-M33 GPS, MQ-3 gas sensor, MFRC522 RFID reader, SH1106 OLED display, and piezoelectric buzzer for local status monitoring and audible warnings.",
    "● Edge AI Computer Vision Suite: A Python software pipeline incorporating YOLOv8n road-object detection, polynomial lane departure tracking, MediaPipe facial landmark drowsiness detection, and Random Forest event/risk classification.",
    "● Web-Based Monitoring Dashboard: A React.js dashboard displaying live GPS location tracking (Leaflet), sensor telemetry gauges, rider authentication status, AI predictions, and historical telemetry charts.",
    "● Backend and Database System: A Node.js and Express backend integrated with MongoDB Atlas and Socket.IO for real-time telemetry streaming, session verification, and incident logging.",
    "● Automated Emergency Alert System: An emergency response module featuring a 10-second cancelable SOS countdown and automated dispatch of SMS (Twilio) and push notifications (NTFY.SH) containing Google Maps GPS coordinates.",
    "● Incident Video Black Box Module: A rolling 250-frame (~10 s) circular video buffer that automatically encodes an H.264 incident clip following emergency detection for cloud/local sharing via notification links.",
    "● QR-Based Emergency Medical Portal: A power-independent printed helmet QR code linking to an online emergency portal (emergency-portal/index.html) displaying essential medical details and click-to-call emergency contacts."
]
replace_cell_paragraphs(t3.rows[7].cells[1], row7_text)

print("Step 9: Updating Row 8 (Expected Outcomes and Impact)...")
row8_text = [
    "Expected Outcomes and Impact:",
    "TECHNICAL",
    "Delivery of an open, reproducible multi-sensor fusion architecture demonstrating that lightweight microcontrollers (ESP32) and edge vision models can be synchronized to monitor rider alertness and vehicle motion dynamics.",
    "SOCIAL",
    "Proactive warnings for fatigue and lane departure, paired with automated location sharing and instant first-responder QR medical profile access, supporting faster emergency awareness during accidents.",
    "ENVIRONMENTAL",
    "Emphasizes component reuse and non-destructive helmet mounting. The design avoids modifying helmet EPS foam, preserves protective gear, and utilizes low-power embedded electronics.",
    "ECONOMIC",
    "Replaces expensive proprietary smart helmets with an accessible system built from off-the-shelf components (ESP32, standard IMU, open-source AI frameworks), establishing a baseline for affordable two-wheeler safety.",
    "INDUSTRIAL",
    "Provides experimental insights for intelligent transportation systems (ITS), two-wheeler telematics providers, and delivery fleet operators seeking modular rider safety solutions.",
    "ACADEMIC",
    "Provides final-year engineering students with hands-on experience in embedded C++ development, edge computer vision, ensemble machine learning, distributed web architectures, and telematic communication protocols.",
    "POTENTIAL USERS",
    "Two-wheeler commuters, student riders, delivery personnel, family members seeking location tracking, and first responders accessing emergency medical profiles on-scene."
]
replace_cell_paragraphs(t3.rows[8].cells[1], row8_text)

print("Step 10: Updating Row 10 (Work Plan Nested Table)...")
work_plan_table = t3.rows[10].cells[1].tables[0]
wp_headers = ["Activity", "Dec 2026", "Jan 2027", "Feb 2027", "Mar 2027", "Apr 2027"]
for col_idx, h in enumerate(wp_headers):
    work_plan_table.rows[0].cells[col_idx].text = h
    for p in work_plan_table.rows[0].cells[col_idx].paragraphs:
        for r in p.runs:
            r.font.name = "Arial"
            r.font.size = Pt(9)
            r.bold = True

wp_rows = [
    ("Baseline hardware testing & calibration (MPU6050, raw MQ-3, GPS)", ["✔️", "", "", "", ""]),
    ("Safe empirical data collection (stationary seated & recorded road video)", ["✔️", "✔️", "", "", ""]),
    ("Model retraining, feature evaluation & Random Forest tuning", ["", "✔️", "✔️", "", ""]),
    ("False-alert characterization & threshold testing (bench vibration, head turns)", ["", "", "✔️", "✔️", ""]),
    ("Emergency notification pipeline & QR portal evaluation (SMS, video export)", ["", "", "", "✔️", "✔️"]),
    ("Documentation, final report, synopsis compilation & poster presentation", ["", "", "", "", "✔️"])
]

for r_idx, (act, ticks) in enumerate(wp_rows, start=1):
    work_plan_table.rows[r_idx].cells[0].text = act
    for p in work_plan_table.rows[r_idx].cells[0].paragraphs:
        for r in p.runs:
            r.font.name = "Times New Roman"
            r.font.size = Pt(9)
    for c_idx, tick in enumerate(ticks, start=1):
        work_plan_table.rows[r_idx].cells[c_idx].text = tick
        for p in work_plan_table.rows[r_idx].cells[c_idx].paragraphs:
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for r in p.runs:
                r.font.name = "Arial"
                r.font.size = Pt(9)

print("Step 11: Updating Row 11 (Facilities Available Nested Table)...")
fac_table = t3.rows[11].cells[1].tables[0]
fac_rows = [
    ("1. Laboratory", "Available (Department of CSE Computer Laboratory with desktop PCs and campus network)"),
    ("2. Equipment", "Standard desktop workstations available; specialized dedicated GPU systems: NONE (Subject to departmental confirmation)"),
    ("3. Software", "Available (Python 3.10+, Arduino IDE 2.x, VS Code, Git, Node.js, modern web browsers)"),
    ("4. Instruments", "Standard digital multimeters and USB serial cables available; calibrated test rigs or impact analyzers: NONE"),
    ("5. Workshop", "Basic mechanical mounting aids; institutional fabrication/workshop services: NONE (Subject to college confirmation)"),
    ("6. Institutional facilities", "Campus network and departmental seminar halls available; 24/7 power backup: Subject to college confirmation")
]
for r_idx, (c0, c1) in enumerate(fac_rows):
    fac_table.rows[r_idx].cells[0].text = c0
    fac_table.rows[r_idx].cells[1].text = c1
    for cell in fac_table.rows[r_idx].cells:
        for p in cell.paragraphs:
            for r in p.runs:
                r.font.name = "Times New Roman"
                r.font.size = Pt(9)

print("Step 12: Updating Row 12 (Major Requirements - Raspberry Pi removed)...")
row12_text = [
    "Major Requirements for the Project:",
    "1. HARDWARE",
    "Microcontroller: Espressif ESP32 WROOM-32 development board.",
    "Inertial Measurement Unit: InvenSense MPU6050 6-axis accelerometer and gyroscope.",
    "GPS Module: Quectel L86-M33 GNSS receiver module with integrated patch antenna.",
    "Alcohol Gas Sensor: MQ-3 analog gas sensor module.",
    "Rider Authentication: MFRC522 13.56 MHz RFID reader with compatible Mifare Classic cards.",
    "Display and Alerts: SH1106 1.3-inch 128×64 monochrome I²C OLED display; active 5V piezoelectric buzzer.",
    "Edge Computing Host (Existing/Available): Laptop/PC with Intel Core i5/i7 or AMD Ryzen processor, 8GB/16GB RAM, and USB interface.",
    "Camera Module: USB HD webcam (720p/1080p, 30 FPS).",
    "Power Supply: 3.7V rechargeable Li-ion battery pack with 5V step-up booster/charging module.",
    "Supporting Hardware: Breadboard/perfboard, jumper wires, terminal connectors, and non-destructive external helmet mounting fixtures.",
    "2. SOFTWARE",
    "Firmware: Arduino IDE 2.x, ESP32 Arduino Core, TinyGPSPlus, Adafruit_SH110X, MFRC522, ArduinoJson.",
    "Computer Vision & AI: Python 3.10+, OpenCV, Ultralytics YOLOv8n, MediaPipe, scikit-learn, NumPy, pandas.",
    "AI Server: FastAPI, Uvicorn, imageio-ffmpeg.",
    "Backend: Node.js, Express.js, Socket.IO, cookie-parser, dotenv.",
    "Database: MongoDB Atlas (cloud M0 cluster).",
    "Frontend Dashboard: React.js (Vite), Tailwind CSS, Leaflet, react-leaflet, Recharts, Lucide React.",
    "Emergency Communication: Twilio REST API (SMS gateway), NTFY.SH (push notifications).",
    "3. CONSUMABLES",
    "Electronic components and spare sensor modules.",
    "Jumper wires, terminal headers, solder wire, and heat-shrink tubing.",
    "Weatherproof vinyl adhesive decals for helmet QR codes.",
    "Non-destructive external mounting clips, foam vibration dampeners, and cable ties.",
    "4. FIELD STUDIES",
    "Safe, consent-based stationary testing for drowsiness tracking.",
    "Pre-recorded road video and low-speed closed-track testing for lane and object detection.",
    "Controlled bench-drop and vibration testing on isolated sensor enclosures (preserving helmet shell integrity)."
]
replace_cell_paragraphs(t3.rows[12].cells[1], row12_text)

print("Step 13: Updating Row 13 (Budget Estimate Nested Table - Rs. 7,000)...")
budget_table = t3.rows[13].cells[1].tables[0]
b_rows = [
    ("Equipment / Components", "0"),
    ("Consumables", "1200"),
    ("Fabrication", "1000"),
    ("Software / Cloud Services", "1500"),
    ("Field Survey / Data Collection", "1500"),
    ("Testing / Analysis", "1000"),
    ("Miscellaneous", "800"),
    ("Total", "7000")
]
for r_idx, (item, cost) in enumerate(b_rows, start=1):
    budget_table.rows[r_idx].cells[0].text = item
    budget_table.rows[r_idx].cells[1].text = cost
    for cell in budget_table.rows[r_idx].cells:
        for p in cell.paragraphs:
            for r in p.runs:
                r.font.name = "Times New Roman"
                r.font.size = Pt(9)
                if item == "Total": r.bold = True

print("Step 14: Updating Row 14 (References [1] to [10])...")
row14_text = [
    "References:",
    "[1] Ministry of Road Transport and Highways, Government of India, \"Road Accidents in India 2022,\" New Delhi, India: Transport Research Wing, Oct. 2023. [Online]. Available: https://morth.nic.in/sites/default/files/RA_2022_30_Oct.pdf",
    "[2] World Health Organization, \"Global Status Report on Road Safety 2023,\" World Health Organization, Geneva, Switzerland, Tech. Rep. ISBN 978-92-4-008651-7, Dec. 2023. [Online]. Available: https://www.who.int/publications/i/item/9789240086517",
    "[3] Y. Choi and Y. Kim, \"Applications of Smart Helmet in Applied Sciences: A Systematic Review,\" Applied Sciences, vol. 11, no. 11, Art. no. 5039, May 2021. doi: 10.3390/app11115039.",
    "[4] P. Lee, H. Kim, M. S. Zitouni, A. Khandoker, H. F. Jelinek, L. Hadjileontiadis, U. Lee, and Y. Jeong, \"Trends in Smart Helmets With Multimodal Sensing for Health and Safety: Scoping Review,\" JMIR mHealth and uHealth, vol. 10, no. 11, Art. no. e40797, Nov. 2022. doi: 10.2196/40797.",
    "[5] M. S. Al-Quraishi, S. S. A. Ali, M. Al-Qurishi, T. B. Tang, and S. Elferik, \"Technologies for Detecting and Monitoring Drivers' States: A Systematic Review,\" Heliyon, vol. 10, no. 20, Art. no. e39592, Oct. 2024. doi: 10.1016/j.heliyon.2024.e39592.",
    "[6] T. Soukupová and J. Čech, \"Real-Time Eye Blink Detection using Facial Landmarks,\" in Proc. 21st Computer Vision Winter Workshop (CVWW), Rimske Toplice, Slovenia, Feb. 2016, pp. 1–8.",
    "[7] L. Breiman, \"Random Forests,\" Machine Learning, vol. 45, no. 1, pp. 5–32, Oct. 2001. doi: 10.1023/A:1010933404324.",
    "[8] G. Jocher, A. Chaurasia, and J. Qiu, \"Ultralytics YOLO,\" Version 8.0.0, Jan. 2023. [Online]. Available: https://github.com/ultralytics/ultralytics",
    "[9] C. Lugaresi et al., \"MediaPipe: A Framework for Building Perception Pipelines,\" arXiv preprint arXiv:1906.08172, Jun. 2019. doi: 10.48550/arXiv.1906.08172.",
    "[10] Anirudha Surabhi Venkata Jagannadha Rao, \"Integrated Smart Helmet and Methods and Systems of Controlling Smart Helmet,\" WIPO Patent WO2020217089A1, Oct. 29, 2020. [Online]. Available: https://patents.google.com/patent/WO2020217089A1/en"
]
replace_cell_paragraphs(t3.rows[14].cells[1], row14_text)

# Save to both Updated and in-place
doc.save(OUT_PATH)
doc.save(SRC_PATH)

print("SUCCESS: Both original and updated docx files have been successfully written!")
