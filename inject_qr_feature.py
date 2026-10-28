"""
Inject First-Responder Emergency QR Code feature into DivyaDrishti_Final_Year_Project_Report.md
"""

MD_PATH = r"C:\Users\ratan\Desktop\DivyaDrishti\DivyaDrishti_Final_Year_Project_Report.md"

with open(MD_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Table of Figures to add Figure 5.10
old_tof = """| Figure 5.9 | Emergency SOS Portal – 10-Second Countdown | 50 |
| Figure 6.1 | Normalized Confusion Matrix – Random Forest Event Classifier (6 Classes) | 55 |"""

new_tof = """| Figure 5.9 | Emergency SOS Portal – 10-Second Countdown | 50 |
| Figure 5.10 | DivyaDrishti First-Responder Emergency QR Code Decal & Cloud Portal | 51 |
| Figure 6.1 | Normalized Confusion Matrix – Random Forest Event Classifier (6 Classes) | 55 |"""

content = content.replace(old_tof, new_tof)

# 2. Add row to Table 3.1
old_table_31 = """| Power Supply | LiPo 3.7V / USB 5V | USB-to-ESP32 via onboard regulator (3.3V output) | System power |"""

new_table_31 = """| Power Supply | LiPo 3.7V / USB 5V | USB-to-ESP32 via onboard regulator (3.3V output) | System power |
| Emergency QR Decals | Dual Weatherproof Vinyl Decals | ISO/IEC 18004 compliant, high-contrast, UV-resistant, front brow & rear nape placement | Zero-app bystander & paramedic access to medical & family ICE profile |"""

content = content.replace(old_table_31, new_table_31)

# 3. Add UC-09 to Section 4.8
old_uc = """8. **UC-08**: Rider or family views historical trips, telemetry, and alert logs on dashboard

### 4.8.1 UML Sequence Diagram: Crash & Emergency Alert Workflow"""

new_uc = """8. **UC-08**: Rider or family views historical trips, telemetry, and alert logs on dashboard
9. **UC-09**: First responder or bystander scans helmet QR code (front/back) → Instant access to rider blood group, allergies, emergency contacts, and medical profile without requiring app or login

### 4.8.1 UML Sequence Diagram: Crash & Emergency Alert Workflow"""

content = content.replace(old_uc, new_uc)

# 4. Add Section 5.6.3 in Chapter 5
old_sec562 = """### 5.6.2 Twilio SMS Content

The SMS sent to the emergency contact includes:
```
DIVYADRISHTI EMERGENCY ALERT
Crash confirmed for rider Sahana.
Location: Hubballi - Dharwad Bypass Road
Speed: 38 km/h
Incident Video (10s): https://d.uguu.se/xxx.mp4
Please check immediately.
Maps: https://www.google.com/maps/search/?api=1&query=15.4318,75.6586
```

---

# CHAPTER 6: TESTING AND RESULTS"""

new_sec563 = """### 5.6.2 Twilio SMS Content

The SMS sent to the emergency contact includes:
```
DIVYADRISHTI EMERGENCY ALERT
Crash confirmed for rider Sahana.
Location: Hubballi - Dharwad Bypass Road
Speed: 38 km/h
Incident Video (10s): https://d.uguu.se/xxx.mp4
Please check immediately.
Maps: https://www.google.com/maps/search/?api=1&query=15.4318,75.6586
```

### 5.6.3 First-Responder Emergency QR Code & Medical Triage Portal

A major life-saving innovation in the DivyaDrishti system is the integration of dual high-contrast, weatherproof, retro-reflective **Quick Response (QR) code decals** affixed strategically to both the **front brow** and **rear nape** of the smart helmet.

In critical trauma incidents where an accident occurs and the rider is rendered unconscious, semi-conscious, or trapped, immediate bystander and paramedic intervention during the **"Golden Hour"** (the first 60 minutes post-trauma) is decisive in preventing permanent disability or fatality. Traditional physical medical cards or smartphone lock screens are frequently inaccessible, destroyed, or locked behind biometric passcodes at an accident scene. The DivyaDrishti helmet overcomes this barrier by transforming the exterior shell into a universal, zero-friction medical beacon.

![DivyaDrishti First-Responder Emergency QR Code Decal](C:\\Users\ratan\\.gemini\\antigravity-ide\\brain\\fc09eda7-c764-4100-8ce5-c2335bc74229\\divyadrishti_emergency_qr_code.png)

*Figure 5.10: DivyaDrishti First-Responder Emergency QR Code Decal — Weatherproof, high-contrast QR decal affixed to front and rear of helmet, linking directly to the cloud-hosted Emergency Medical Portal.*

#### Architectural & Operational Workflow:

1. **Dual-Decal Physical Placement:**
   - **Front Decal:** Placed above the visor brow line, ensuring immediate visibility when a paramedic approaches the fallen rider head-on.
   - **Rear Decal:** Positioned at the occipital curve (rear nape), ensuring visibility even if the rider is lying face-down or resting against an obstacle.
   - **Material Specification:** High-durability, weather-resistant vinyl with UV lamination and retro-reflective backing to ensure camera readability under nighttime vehicle headlight illumination.

2. **Zero-App Instant Accessibility:**
   - Any bystander, traffic police officer, or ambulance paramedic equipped with a standard smartphone camera (iOS, Android, or third-party scanner) can scan the QR code instantly.
   - **No login, authentication, or app installation is required**, eliminating all friction during life-or-death triage scenarios.

3. **Dedicated Cloud Emergency Portal Gateway:**
   - The QR code resolves directly to the production cloud endpoint:
     `https://raghavendrasingbhajeri.github.io/divyadrishti_emergency_portal/`
   
4. **Comprehensive Rider Triage & ICE (In Case of Emergency) Profile:**
   When scanned, the responsive emergency web portal presents:
   - **Rider Identity:** Full Name, Recent Photograph, Age, Gender, and Primary Language.
   - **Critical Hematology & Allergies:** Prominently highlighted **Blood Group** (e.g., O+ve, B-ve) with Rh-factor badge, documented **Drug Allergies** (e.g., Penicillin, NSAIDs, Sulfa drugs, Local Anesthetics), and food/environmental sensitivities. Immediate visibility of drug allergies prevents lethal anaphylactic reactions during emergency drug administration.
   - **Pre-existing Medical Conditions:** Chronic conditions including Asthma, Type-1/2 Diabetes, Epilepsy, Cardiac conditions, and active medications.
   - **One-Touch Emergency Calling (ICE):** Direct dial buttons (`tel:+91...`) for primary next-of-kin (Parents, Spouse, Guardian), enabling first responders to contact family with a single tap.
   - **Vehicle & Insurance Information:** Two-wheeler registration number, insurance policy ID, Third-Party Administrator (TPA) contact, and preferred trauma care facility.
   - **Organ Donor Status:** Verified digital indicator confirming donor consent.

5. **Passive Redundancy & Crash Survival:**
   - Unlike active electronic components which may suffer power loss if the LiPo battery or ESP32 wiring is severed during a catastrophic high-speed crash, the **passive QR code decal requires zero electrical power**.
   - This ensures that even under total electronic subsystem failure, the helmet provides 100% reliable medical triage information to emergency personnel.

---

# CHAPTER 6: TESTING AND RESULTS"""

content = content.replace(old_sec562, new_sec563)

with open(MD_PATH, 'w', encoding='utf-8') as f:
    f.write(content)

print("Injected First-Responder QR feature into markdown successfully!")
