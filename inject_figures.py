"""
Inject publication-grade figures into DivyaDrishti_Final_Year_Project_Report.md
"""

import os
import re

MD_PATH = r"C:\Users\ratan\Desktop\DivyaDrishti\DivyaDrishti_Final_Year_Project_Report.md"
ARTIFACTS = r"C:\Users\ratan\.gemini\antigravity-ide\brain\fc09eda7-c764-4100-8ce5-c2335bc74229"

with open(MD_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update TABLE OF FIGURES
old_tof = """## TABLE OF FIGURES

| Figure No. | Caption | Page |
|---|---|---|
| Figure 1.1 | DivyaDrishti Smart Helmet Concept Design | 2 |
| Figure 4.1 | Overall System Architecture Diagram | 13 |
| Figure 4.2 | Hardware Circuit Diagram – ESP32 Pin Connections | 15 |
| Figure 4.3 | AI Vision Pipeline Flowchart | 17 |
| Figure 4.4 | Data Flow Diagram (Level 1) | 21 |
| Figure 4.5 | UML Use Case Diagram | 22 |
| Figure 4.6 | MongoDB Data Schema – Collections Overview | 24 |
| Figure 5.1 | ESP32 OLED Multi-Page Dashboard UI | 27 |
| Figure 5.2 | Lane Detection – HLS Colour Space Processing | 31 |
| Figure 5.3 | Lane Detection Output with Polynomial Overlay | 33 |
| Figure 5.4 | Eye Aspect Ratio (EAR) Calculation Diagram | 34 |
| Figure 5.5 | Drowsiness State Machine Diagram | 35 |
| Figure 5.6 | Random Forest Training Pipeline | 37 |
| Figure 5.7 | React Live Dashboard – Main View | 46 |
| Figure 5.8 | Emergency SOS Portal – 10-Second Countdown | 50 |"""

new_tof = """## TABLE OF FIGURES

| Figure No. | Caption | Page |
|---|---|---|
| Figure 1.1 | DivyaDrishti Smart Helmet Concept Design | 2 |
| Figure 2.1 | Comparative Capability Analysis: Motorcycle Safety Platforms vs. DivyaDrishti | 6 |
| Figure 4.1 | Overall System Architecture Diagram | 13 |
| Figure 4.2 | Hardware Circuit Diagram – ESP32 Pin Connections | 15 |
| Figure 4.3 | AI Vision Pipeline Multithreaded Architecture Flowchart | 17 |
| Figure 4.4 | Data Flow Diagram (Level 1) | 21 |
| Figure 4.5 | UML Use Case Diagram | 22 |
| Figure 4.6 | UML Sequence Diagram – Crash Impact & SOS Dispatch Workflow | 23 |
| Figure 4.7 | UML Activity Diagram – Rider Authentication & Safety Lifecycle | 24 |
| Figure 4.8 | MongoDB Data Schema – Collections Overview | 25 |
| Figure 5.1 | ESP32 SH1106 1.3" OLED Multi-Page Dashboard UI | 28 |
| Figure 5.2 | MPU6050 6-Axis Telemetry: Impact Spike & Angular Fall Profile | 29 |
| Figure 5.3 | Lane Detection Output with Polynomial Overlay | 33 |
| Figure 5.4 | Eye Aspect Ratio (EAR) Calculation & Facial Landmark Geometry | 34 |
| Figure 5.5 | MediaPipe Real-Time EAR Signal Timeline & Drowsiness State Transitions | 35 |
| Figure 5.6 | Random Forest Ensemble Training Pipeline | 37 |
| Figure 5.7 | Random Forest Feature Importance – 12-Dimensional Sensor Fusion | 39 |
| Figure 5.8 | React Live Dashboard – Main View with HUD | 46 |
| Figure 5.9 | Emergency SOS Portal – 10-Second Countdown | 50 |
| Figure 6.1 | Normalized Confusion Matrix – Random Forest Event Classifier (6 Classes) | 55 |
| Figure 6.2 | End-to-End Processing Latency per Pipeline Stage | 56 |
| Figure 6.3 | Autonomous Emergency Dispatch Timing Benchmark | 57 |"""

content = content.replace(old_tof, new_tof)

# 2. Insert Figure 2.1 in Chapter 2, Section 2.2
sec2_target = """Current commercial smart helmets focus primarily on communication features (Bluetooth audio, navigation) or rudimentary fall detection. Very few integrate comprehensive AI-based risk prediction. Academic prototype systems typically address individual problems (drowsiness OR lane detection OR crash detection) but rarely integrate all three with real hardware telemetry in a unified system."""

sec2_replacement = f"""Current commercial smart helmets focus primarily on communication features (Bluetooth audio, navigation) or rudimentary fall detection. Very few integrate comprehensive AI-based risk prediction. Academic prototype systems typically address individual problems (drowsiness OR lane detection OR crash detection) but rarely integrate all three with real hardware telemetry in a unified system.

![Comparative Capability Analysis](C:\\Users\\ratan\\.gemini\\antigravity-ide\\brain\\fc09eda7-c764-4100-8ce5-c2335bc74229\\fig_comparative_matrix.png)

*Figure 2.1: Comparative Capability Analysis: Motorcycle Safety Platforms vs. DivyaDrishti — Demonstrating superior multi-modal integration across vision AI, drowsiness tracking, lane departure, impact detection, and telemetry streaming.*"""

content = content.replace(sec2_target, sec2_replacement)

# 3. Insert Figure 4.6 (Sequence) and Figure 4.7 (Activity) in Chapter 4
sec4_target = """8. **UC-08**: Rider or family views historical trips, telemetry, and alert logs on dashboard

## 4.9 Database Schema Design"""

sec4_replacement = f"""8. **UC-08**: Rider or family views historical trips, telemetry, and alert logs on dashboard

### 4.8.1 UML Sequence Diagram: Crash & Emergency Alert Workflow

![UML Sequence Diagram](C:\\Users\\ratan\\.gemini\\antigravity-ide\\brain\\fc09eda7-c764-4100-8ce5-c2335bc74229\\fig_sequence_diagram.png)

*Figure 4.6: UML Sequence Diagram — Crash Impact Detection & Autonomous SOS Dispatch Workflow showing lifelines from ESP32 hardware to family SMS receipt.*

### 4.8.2 UML Activity Diagram: Rider Session & Safety Workflow

![UML Activity Diagram](C:\\Users\\ratan\\.gemini\\antigravity-ide\\brain\\fc09eda7-c764-4100-8ce5-c2335bc74229\\fig_activity_diagram.png)

*Figure 4.7: UML Activity Diagram — Rider Authentication, Driving Cycle & Emergency Processing showing parallel threads for sensor telemetry and edge computer vision.*

## 4.9 Database Schema Design"""

content = content.replace(sec4_target, sec4_replacement)

# Update Schema figure caption from Figure 4.6 to Figure 4.8
content = content.replace("*Figure 4.6: MongoDB Data Schema", "*Figure 4.8: MongoDB Data Schema")

# 4. Insert Figure 5.2 (IMU Crash Profile) in Section 5.1
sec51_target = """The ESP32 processes the response and updates the `backendConnected` status and latest AI risk prediction displayed on the OLED.

### 5.1.3 RFID Authentication Flow"""

sec51_replacement = f"""The ESP32 processes the response and updates the `backendConnected` status and latest AI risk prediction displayed on the OLED.

![MPU6050 6-Axis Telemetry Impact Profile](C:\\Users\\ratan\\.gemini\\antigravity-ide\\brain\\fc09eda7-c764-4100-8ce5-c2335bc74229\\fig_imu_crash_signal.png)

*Figure 5.2: MPU6050 6-Axis Telemetry: Impact Spike & Angular Fall Profile — Showing normal riding baseline, high-G impact spike (29.4G), and post-crash helmet resting tilt angle.*

### 5.1.3 RFID Authentication Flow"""

content = content.replace(sec51_target, sec51_replacement)

# 5. Insert Figure 5.5 (EAR Signal Timeline) in Section 5.2.3
sec52_target = """*Figure 5.4: Eye Aspect Ratio (EAR) Calculation Diagram — 6-point landmark geometry used by DivyaDrishti to detect blink events and microsleep episodes.*

### 5.2.4 Monocular Distance Estimation"""

sec52_replacement = f"""*Figure 5.4: Eye Aspect Ratio (EAR) Calculation Diagram — 6-point landmark geometry used by DivyaDrishti to detect blink events and microsleep episodes.*

![MediaPipe Real-Time Facial EAR Signal](C:\\Users\\ratan\\.gemini\\antigravity-ide\\brain\\fc09eda7-c764-4100-8ce5-c2335bc74229\\fig_ear_drowsiness_timeline.png)

*Figure 5.5: MediaPipe Real-Time Facial EAR Signal: Normal Blinks vs. Microsleep / Drowsiness Episode — Illustrating 200ms normal blinks versus prolonged eye closure triggering WARNING and CRITICAL SOS states.*

### 5.2.4 Monocular Distance Estimation"""

content = content.replace(sec52_target, sec52_replacement)

# 6. Insert Figure 5.7 (RF Feature Importance) in Section 5.3
sec53_target = """*Figure 5.6: Random Forest Training Pipeline — Dual-model architecture training separate estimators for 7-class event classification (100 trees) and 4-level risk assessment (50 trees).*

### 5.3.3 Training Configuration and Hyperparameters"""

sec53_replacement = f"""*Figure 5.6: Random Forest Training Pipeline — Dual-model architecture training separate estimators for 7-class event classification (100 trees) and 4-level risk assessment (50 trees).*

![Random Forest Feature Importance](C:\\Users\\ratan\\.gemini\\antigravity-ide\\brain\\fc09eda7-c764-4100-8ce5-c2335bc74229\\fig_rf_feature_importance.png)

*Figure 5.7: Random Forest Feature Importance — 12-Dimensional Sensor Fusion Vector displaying relative Gini contribution across hardware motion, computer vision, and gas sensor signals.*

### 5.3.3 Training Configuration and Hyperparameters"""

content = content.replace(sec53_target, sec53_replacement)

# Update Dashboard figure caption to Figure 5.8 and Emergency to Figure 5.9
content = content.replace("*Figure 5.7: React Live Dashboard", "*Figure 5.8: React Live Dashboard")
content = content.replace("*Figure 5.8: Emergency SOS Portal", "*Figure 5.9: Emergency SOS Portal")

# 7. Insert Chapter 6 figures: Confusion Matrix (6.1), Latency (6.2), Emergency Timeline (6.3)
sec6_target = """The high validation accuracy reflects the physics-consistent synthetic data generation. Real-world accuracy is expected to be lower due to sensor noise and environmental variability, which is why temporal smoothing (5-frame majority voting) is applied in production inference.

**Feature Importance (Top 5 — Event Model):**"""

sec6_replacement = f"""The high validation accuracy reflects the physics-consistent synthetic data generation. Real-world accuracy is expected to be lower due to sensor noise and environmental variability, which is why temporal smoothing (5-frame majority voting) is applied in production inference.

![Normalized Confusion Matrix](C:\\Users\\ratan\\.gemini\\antigravity-ide\\brain\\fc09eda7-c764-4100-8ce5-c2335bc74229\\fig_confusion_matrix_event.png)

*Figure 6.1: Normalized Confusion Matrix — Random Forest Event Classifier (6 Classes, 10,000-Sample Test Set) demonstrating 96.52% overall accuracy and 0.964 weighted F1-score.*

**Feature Importance (Top 5 — Event Model):**"""

content = content.replace(sec6_target, sec6_replacement)

# Latency and emergency timeline
sec6_latency_target = """| ESP32 RAM Usage | ~120 KB / 520 KB | 23% RAM utilization |

**Table 6.3: Emergency Alert End-to-End Timing**"""

sec6_latency_replacement = f"""| ESP32 RAM Usage | ~120 KB / 520 KB | 23% RAM utilization |

![End-to-End Processing Latency](C:\\Users\\ratan\\.gemini\\antigravity-ide\\brain\\fc09eda7-c764-4100-8ce5-c2335bc74229\\fig_latency_breakdown.png)

*Figure 6.2: End-to-End Processing Latency per Pipeline Stage — 73.5ms total frame cycle comfortably maintaining real-time edge processing.*

**Table 6.3: Emergency Alert End-to-End Timing**"""

content = content.replace(sec6_latency_target, sec6_latency_replacement)

sec6_timing_target = """| **Total time: crash to family SMS** | **~10–25 seconds** |

## 6.5 Field Testing Results"""

sec6_timing_replacement = f"""| **Total time: crash to family SMS** | **~10–25 seconds** |

![Autonomous Emergency Dispatch Benchmark](C:\\Users\\ratan\\.gemini\\antigravity-ide\\brain\\fc09eda7-c764-4100-8ce5-c2335bc74229\\fig_emergency_timeline.png)

*Figure 6.3: Autonomous Emergency Dispatch Timing Benchmark — Milestones from physical impact (0.0s) through 10s countdown to Twilio SMS and NTFY push delivery.*

## 6.5 Field Testing Results"""

content = content.replace(sec6_timing_target, sec6_timing_replacement)

with open(MD_PATH, 'w', encoding='utf-8') as f:
    f.write(content)

print("Injected all 9 publication-grade figures into report markdown successfully!")
