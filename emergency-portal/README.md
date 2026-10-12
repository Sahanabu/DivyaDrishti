# 🚨 DivyaDrishti - Emergency Crash Lifeline (Bystander Web Portal)

A zero-dependency, mobile-optimized static web portal designed to be hosted for free on **GitHub Pages**. 
Attached via a physical **QR code sticker on the rider's helmet or motorbike fuel tank**.

---

## 💡 How It Works

1. **Accident Occurs:** A passerby / Good Samaritan sees the rider after a crash.
2. **Scan Helmet QR:** The bystander scans the QR code sticker on the helmet using their smartphone camera.
3. **Instant Vital Information:** The portal displays:
   - Rider's Full Name (`Sahana`)
   - Blood Group (`A+` in high visibility)
   - Home Address (`Karmudi, Koppal Ditrict, Karnataka.`)
   - Vehicle Registration Number (`Honda Active ( KA 28 HM 8281 )`)
   - Emergency Family Phone (`+91 8431712890`)
   - Medical condition alerts
4. **Witness Check-In (Security & Accountability):**
   - Collects the bystander's Name and Phone Number.
   - Automatically acquires the crash site's live **GPS coordinates** via HTML5 Geolocation (`±accuracy` in meters).
5. **One-Tap Family & Emergency Contact:**
   - **WhatsApp Alert:** Instantly formats an urgent WhatsApp message with rider details, witness contact number, home address, and a direct Google Maps pin link to the crash location.
   - **Direct Phone Call:** Dials the family guardian immediately (+91 8431712890).
   - **108 / 112 Hotline:** One-click dials the state ambulance / emergency response services.
6. **Good Samaritan Protection:** Highlights legal immunity under the Indian Motor Vehicles Act Section 134A to encourage bystanders to help without fear of harassment.

---

## 🚀 How to Host for Free on GitHub Pages

1. **Push to GitHub:**
   - Push this `emergency-portal` folder to a GitHub repository (e.g., `https://github.com/your-username/divyadrishti-lifeline` or as a branch/subfolder).
2. **Enable GitHub Pages:**
   - Go to your GitHub Repository -> **Settings** -> **Pages**.
   - Under **Build and deployment** -> **Source**: Select `Deploy from a branch`.
   - Branch: `main` / folder `/root` (or `/docs`).
   - Click **Save**.
3. **Your Live URL:**
   - GitHub Pages will give you an instant public HTTPS URL, for example:
     `https://your-username.github.io/divyadrishti-lifeline/`
4. **Print Helmet QR Code:**
   - Open the live link, expand the **"Show / Print Helmet QR Code Sticker"** section, download the QR code image, and print it as a weatherproof sticker for the helmet!

---

## 🛠️ Dynamic URL Query Parameters

You can customize the credentials for different family members or riders dynamically without changing any code:

```text
https://your-username.github.io/divyadrishti-lifeline/?name=Sahana&phone=8431712890&blood=A%2B&vehicle=KA-28-HM-8281&address=Karmudi%2C%20Koppal
```

| Parameter | Description | Default Value |
| :--- | :--- | :--- |
| `name` | Full name of rider | `Sahana` |
| `phone` | 10-digit family phone number | `8431712890` |
| `blood` | Blood group | `A+` |
| `vehicle` | Vehicle make & number | `Honda Active ( KA 28 HM 8281 )` |
| `address` | Home address | `Karmudi, Koppal Ditrict, Karnataka.` |
| `guardian`| Role of emergency contact | `Father / Guardian` |

---

## 🔒 Security & Privacy Notice
All inputs (witness name, phone number, and GPS coordinates) are processed purely on the client side without cookies or server trackers, and sent directly to the family's WhatsApp / Phone app.
