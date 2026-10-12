// ============================================================
//                  DIVYADRISHTI SMART HELMET
// ============================================================
//
// ESP32 Smart Helmet System
//
// FEATURES
// ------------------------------------------------------------
// 1. RFID rider authentication
// 2. Authorized / unauthorized access
// 3. 1-hour riding session
// 4. SH1106 OLED attractive UI
// 5. L86-M33 GPS
// 6. GPS coordinates
// 7. Wi-Fi connectivity
// 8. Wi-Fi reverse geocoding
// 9. Place-name display
// 10. Raw motion sensor communication
// 11. ACC + GYRO + temperature
// 12. Pitch / Roll
// 13. Impact detection
// 14. Buzzer warnings
// 15. MQ-3 monitoring
// 16. Rider information
// 17. Family contact information
// 18. Live telemetry preparation
// 19. Backend alert preparation
// 20. Automatic OLED page rotation
// 21. Non-blocking main loop
// 22. GPS continuously processed
// 23. Wi-Fi automatically reconnects
//
// ============================================================

#include <Wire.h>
#include <SPI.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

#include <Adafruit_GFX.h>
#include <Adafruit_SH110X.h>

#include <MFRC522.h>
#include <TinyGPSPlus.h>
#include <math.h>

// ============================================================
//                    USER CONFIGURATION
// ============================================================

// ---------- Wi-Fi ----------
#define ENABLE_WIFI true

const char* WIFI_SSID     = "Infinix Note 40 pro 5g";
const char* WIFI_PASSWORD = "raghu1535";

// ---------- Backend ----------
#define USE_BACKEND true

// Laptop's active backend server on the Infinix hotspot (port 5000)
const char* BACKEND_URL = "http://10.186.77.13:5000/api";

// ============================================================
//                         PIN DEFINITIONS
// ============================================================

// OLED + Motion sensor
#define I2C_SDA 21
#define I2C_SCL 22

// GPS
#define GPS_RX_PIN 16
#define GPS_TX_PIN 17

// MQ3
#define MQ3_PIN 34

// Buzzer
#define BUZZER_PIN 25

// RFID
#define RFID_SS_PIN   5
#define RFID_RST_PIN  4
#define RFID_SCK_PIN  18
#define RFID_MOSI_PIN 23
#define RFID_MISO_PIN 19

// ============================================================
//                       OLED CONFIGURATION
// ============================================================

#define SCREEN_WIDTH  128
#define SCREEN_HEIGHT 64

Adafruit_SH1106G display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// ============================================================
//                        RFID OBJECT
// ============================================================

MFRC522 rfid(RFID_SS_PIN, RFID_RST_PIN);

// ============================================================
//                         GPS OBJECT
// ============================================================

HardwareSerial GPSSerial(2);
TinyGPSPlus gps;

// ============================================================
//                    RAW MOTION SENSOR
// ============================================================

#define MOTION_ADDR       0x68
#define WHO_AM_I_REG      0x75
#define PWR_MGMT_1_REG    0x6B
#define ACCEL_XOUT_H      0x3B
#define GYRO_CONFIG_REG   0x1B
#define ACCEL_CONFIG_REG  0x1C

// Motion values
float accelX = 0.0;
float accelY = 0.0;
float accelZ = 0.0;

float gyroX = 0.0;
float gyroY = 0.0;
float gyroZ = 0.0;

float motionTemperature = 0.0;
float accelerationMagnitude = 0.0;

float pitchAngle = 0.0;
float rollAngle  = 0.0;

// ============================================================
//                     RIDER INFORMATION
// ============================================================

const char RIDER_NAME[]   = "Sahana";
const char RIDER_PHONE[]  = "+91 8431712890";
const char FAMILY_PHONE[] = "+91 9482672566";

// ============================================================
//                         RFID UIDs
// ============================================================

byte AUTH_UID[]   = { 0xC9, 0xDA, 0x12, 0x07 };
byte UNAUTH_UID[] = { 0xBD, 0x92, 0x35, 0x07 };

// ============================================================
//                      SYSTEM STATE
// ============================================================

bool systemReady         = false;
bool rfidReady           = false;
byte rfidHardwareVersion = 0x00;
bool motionSensorReady   = false;
bool wifiConnected       = false;
bool gpsHasFix           = false;

bool sessionActive       = false;
bool unauthorizedScreen  = false;
bool authSuccessScreen   = false;
bool impactAlertActive   = false;
bool backendConnected    = false;
int  lastBackendStatus   = 0;

unsigned long sessionStartTime = 0;
unsigned long authSuccessStart = 0;
const unsigned long SESSION_DURATION = 60UL * 60UL * 1000UL;  // 1 hour

// ============================================================
//                        OLED PAGES
// ============================================================

enum ScreenPage {
  PAGE_DASHBOARD = 0,
  PAGE_RIDER,
  PAGE_SESSION,
  PAGE_LOCATION,
  PAGE_SAFETY,
  PAGE_MOTION,
  PAGE_DIAGNOSTICS,
  PAGE_COUNT
};

ScreenPage currentPage = PAGE_DASHBOARD;

// ============================================================
//                        TIMERS
// ============================================================

unsigned long lastDisplayUpdate   = 0;
unsigned long lastPageChange      = 0;
unsigned long lastGPSUpdate       = 0;
unsigned long lastMotionUpdate    = 0;
unsigned long lastMQUpdate        = 0;
unsigned long lastWiFiCheck       = 0;
unsigned long lastGeocode         = 0;
unsigned long lastBackendSend     = 0;
unsigned long unauthorizedStart   = 0;
unsigned long impactAlertStart    = 0;
unsigned long lastImpactDetection = 0;

// ============================================================
//                       INTERVALS
// ============================================================

const unsigned long DISPLAY_INTERVAL = 100;
const unsigned long PAGE_INTERVAL    = 3500;
const unsigned long MOTION_INTERVAL  = 150;
const unsigned long MQ_INTERVAL      = 500;
const unsigned long WIFI_INTERVAL    = 10000;
const unsigned long GEOCODE_INTERVAL = 60000;
const unsigned long BACKEND_INTERVAL = 3000;

// ============================================================
//                      MQ3 VARIABLES
// ============================================================

int mq3Value = 0;
// MQ-3 baseline thresholds (raw ADC, requires field calibration)
const int MQ3_CLEAN_THRESHOLD   = 350;
const int MQ3_CAUTION_THRESHOLD = 600;

// ============================================================
//                    GPS LOCATION DATA & HEALTH
// ============================================================

double latitude  = 0.0;
double longitude = 0.0;
double speed     = 0.0;

long debugHighs = 0;
long debugLows  = 0;

String placeName    = "Searching for location...";
String districtName = "";
String stateName    = "";
String countryName  = "";

enum LocationState {
  LOC_GPS_FIX = 0,         // Priority 1: High accuracy GPS fix
  LOC_GPS_STALE,           // GPS fix recently lost (<8s)
  LOC_WIFI_ESTIMATING,     // Wi-Fi scan / lookup in progress
  LOC_ESTIMATE_READY,      // Priority 2: Wi-Fi / fallback estimate active
  LOC_CACHED,              // Priority 4: Last known location displayed
  LOC_UNAVAILABLE          // No valid coordinates from any source
};

LocationState locationState = LOC_UNAVAILABLE;

enum WifiScanState {
  SCAN_IDLE = 0,
  SCAN_RUNNING
};
WifiScanState wifiScanState = SCAN_IDLE;

unsigned long lastWifiScanStart        = 0;
unsigned long lastWifiEstimateRequest  = 0;
const unsigned long WIFI_SCAN_INTERVAL = 20000; // 20s between scans when GPS is offline

// GPS Health tracking
unsigned long lastGPSCharTime         = 0;
unsigned long lastValidFixTime         = 0;
int consecutiveGpsFixCount             = 0;
bool gpsUartActive                     = false;

// Cached location (Last known location)
double cachedLatitude                  = 0.0;
double cachedLongitude                 = 0.0;
String cachedPlaceName                 = "";
unsigned long cachedLocationTime       = 0;
bool hasCachedLocation                 = false;
String locationStatus                  = "SEARCHING"; // "RESOLVED", "APPROXIMATE", "SEARCHING", "UNAVAILABLE"

bool isValidGeoCoord(double lat, double lon) {
  if (isnan(lat) || isnan(lon)) return false;
  if (lat == 0.0 && lon == 0.0) return false;
  if (lat < -90.0 || lat > 90.0) return false;
  if (lon < -180.0 || lon > 180.0) return false;
  return true;
}

// ============================================================
//                       IMPACT SETTINGS
// ============================================================

const float IMPACT_THRESHOLD     = 25.0;
const float GYRO_ALERT_THRESHOLD = 350.0;

// ============================================================
//                         COLORS
// ============================================================

#define OLED_ON  SH110X_WHITE
#define OLED_OFF SH110X_BLACK

// ============================================================
//                        BUZZER FUNCTIONS
// ============================================================

void buzzerTone(int frequency, int duration) {
  ledcAttach(BUZZER_PIN, frequency, 8);
  ledcWriteTone(BUZZER_PIN, frequency);
  delay(duration);
  ledcWriteTone(BUZZER_PIN, 0);
  ledcDetach(BUZZER_PIN);
}

void beepStartup() {
  int melody[]    = { 523, 659, 784, 1047 };
  int durations[] = { 150, 150, 150, 300 };
  for (int i = 0; i < 4; i++) {
    buzzerTone(melody[i], durations[i]);
    delay((int)(durations[i] * 1.1));
  }
}

void beepOffline() {
  int melody[]    = { 880, 784, 698, 587 };
  int durations[] = { 200, 200, 200, 400 };
  for (int i = 0; i < 4; i++) {
    buzzerTone(melody[i], durations[i]);
    delay((int)(durations[i] * 1.1));
  }
}

void beepCardDetected() {
  buzzerTone(1800, 100);
}

void beepAuthorized() {
  buzzerTone(1500, 100);
  delay(70);
  buzzerTone(2000, 150);
}

void beepUnauthorized() {
  buzzerTone(700, 150);
  delay(80);
  buzzerTone(700, 150);
  delay(80);
  buzzerTone(700, 200);
}

void beepImpact() {
  buzzerTone(2200, 200);
  delay(80);
  buzzerTone(1200, 250);
  delay(80);
  buzzerTone(2200, 250);
}

// ============================================================
//                    PROGMEM PIXEL-ART ICONS
// ============================================================

// 16x16 Futuristic Safety Shield
static const unsigned char PROGMEM icon_shield_16x16[] = {
  0x00, 0x00, 0x7F, 0xFE, 0x7F, 0xFE, 0x70, 0x0E,
  0x77, 0xEE, 0x77, 0xEE, 0x73, 0xCE, 0x73, 0xCE,
  0x3B, 0xDC, 0x39, 0x9C, 0x1C, 0x38, 0x1E, 0x78,
  0x0E, 0x70, 0x07, 0xE0, 0x03, 0xC0, 0x01, 0x80
};

// 16x16 Aerodynamic Helmet
static const unsigned char PROGMEM icon_helmet_16x16[] = {
  0x0F, 0xF0, 0x3F, 0xFC, 0x7F, 0xFE, 0xFF, 0xFF,
  0xF0, 0x07, 0xF0, 0x03, 0xFF, 0xC1, 0xFF, 0xE1,
  0xFF, 0xE3, 0xFF, 0xC3, 0x7F, 0x87, 0x7F, 0xFF,
  0x3F, 0xFE, 0x1F, 0xFC, 0x07, 0xF0, 0x00, 0x00
};

// 12x12 Wi-Fi Signal
static const unsigned char PROGMEM icon_wifi_12x12[] = {
  0x00, 0x00, 0x3F, 0xC0, 0x7F, 0xE0, 0xC0, 0x30,
  0x1F, 0x80, 0x3F, 0xC0, 0x60, 0x60, 0x0E, 0x00,
  0x1F, 0x00, 0x00, 0x00, 0x06, 0x00, 0x06, 0x00
};

// 12x12 GPS Location Pin
static const unsigned char PROGMEM icon_gps_pin_12x12[] = {
  0x1F, 0x00, 0x3F, 0x80, 0x79, 0xC0, 0x71, 0xC0,
  0x79, 0xC0, 0x3F, 0x80, 0x1F, 0x00, 0x0E, 0x00,
  0x0E, 0x00, 0x04, 0x00, 0x04, 0x00, 0x00, 0x00
};

// 12x12 Orbiting Satellite
static const unsigned char PROGMEM icon_satellite_12x12[] = {
  0x80, 0x10, 0xC3, 0x30, 0x67, 0x60, 0x3F, 0xC0,
  0x1F, 0x80, 0x0E, 0x00, 0x1F, 0x80, 0x3F, 0xC0,
  0x67, 0x60, 0xC3, 0x30, 0x80, 0x10, 0x00, 0x00
};

// 16x16 Smart RFID Card
static const unsigned char PROGMEM icon_rfid_16x16[] = {
  0x00, 0x00, 0x7F, 0xFE, 0xFF, 0xFF, 0xC0, 0x03,
  0xCF, 0xE3, 0xCF, 0xE3, 0xC0, 0x03, 0xC7, 0xC3,
  0xC7, 0xC3, 0xC0, 0x03, 0xC3, 0x83, 0xC0, 0x03,
  0xFF, 0xFF, 0x7F, 0xFE, 0x00, 0x00, 0x00, 0x00
};

// 16x16 Success Badge Checkmark
static const unsigned char PROGMEM icon_success_16x16[] = {
  0x07, 0xE0, 0x1F, 0xF8, 0x3F, 0xFC, 0x78, 0x0E,
  0x70, 0x1E, 0xE0, 0x37, 0xE0, 0x67, 0xE0, 0xEF,
  0xE1, 0xCF, 0xF3, 0x9F, 0x7F, 0x1E, 0x7E, 0x3E,
  0x3C, 0x7C, 0x1F, 0xF8, 0x07, 0xE0, 0x00, 0x00
};

// 16x16 Hazard Warning Triangle
static const unsigned char PROGMEM icon_warning_16x16[] = {
  0x01, 0x80, 0x03, 0xC0, 0x03, 0xC0, 0x07, 0xE0,
  0x06, 0x60, 0x0E, 0x70, 0x0C, 0x30, 0x1D, 0xB8,
  0x1D, 0xB8, 0x39, 0x9C, 0x39, 0x9C, 0x70, 0x0E,
  0x71, 0x8E, 0xFF, 0xFF, 0xFF, 0xFF, 0x00, 0x00
};

// 12x12 Cloud Infrastructure
static const unsigned char PROGMEM icon_cloud_12x12[] = {
  0x00, 0x00, 0x0E, 0x00, 0x1F, 0x00, 0x33, 0x80,
  0x61, 0xC0, 0xC0, 0x60, 0xC0, 0x30, 0x80, 0x10,
  0xFF, 0xF0, 0x7F, 0xE0, 0x00, 0x00, 0x00, 0x00
};

// ============================================================
//                       OLED UI PRIMITIVES
// ============================================================

void clearOLED() {
  display.clearDisplay();
  display.setTextColor(SH110X_WHITE);
  display.setTextWrap(false);
}

void drawHeader(const char* title, const unsigned char* icon = nullptr) {
  display.fillRect(0, 0, SCREEN_WIDTH, 12, SH110X_WHITE);
  display.setTextColor(SH110X_BLACK);
  display.setTextSize(1);

  int textX = 4;
  if (icon != nullptr) {
    display.drawBitmap(3, 0, icon, 12, 12, SH110X_BLACK);
    textX = 18;
  }
  display.setCursor(textX, 2);
  display.print(title);

  // Top-right glanceable status dots (Wi-Fi & GPS)
  if (wifiConnected) {
    display.fillCircle(115, 6, 2, SH110X_BLACK);
  } else {
    display.drawCircle(115, 6, 2, SH110X_BLACK);
  }

  if (gpsHasFix) {
    display.fillCircle(123, 6, 2, SH110X_BLACK);
  } else {
    display.drawCircle(123, 6, 2, SH110X_BLACK);
  }

  display.setTextColor(SH110X_WHITE);
}

void drawDivider(int y) {
  display.drawLine(4, y, 123, y, SH110X_WHITE);
}

void centerText(const String& text, int y, int size = 1) {
  display.setTextSize(size);
  int16_t x1, y1;
  uint16_t w, h;
  display.getTextBounds(text, 0, y, &x1, &y1, &w, &h);
  int x = (128 - (int)w) / 2;
  if (x < 0) x = 0;
  display.setCursor(x, y);
  display.print(text);
}

void drawProgressBar(int x, int y, int width, int height, int percent) {
  percent = constrain(percent, 0, 100);
  display.drawRoundRect(x, y, width, height, 2, SH110X_WHITE);
  int fillWidth = ((width - 4) * percent) / 100;
  if (fillWidth > 0) {
    display.fillRoundRect(x + 2, y + 2, fillWidth, height - 4, 1, SH110X_WHITE);
  }
}

void drawBadge(int x, int y, int w, int h, const char* text, bool filled = false) {
  if (filled) {
    display.fillRoundRect(x, y, w, h, 2, SH110X_WHITE);
    display.setTextColor(SH110X_BLACK);
  } else {
    display.drawRoundRect(x, y, w, h, 2, SH110X_WHITE);
    display.setTextColor(SH110X_WHITE);
  }
  display.setTextSize(1);
  int16_t x1, y1;
  uint16_t tw, th;
  display.getTextBounds(text, 0, 0, &x1, &y1, &tw, &th);
  int tx = x + (w - (int)tw) / 2;
  int ty = y + (h - (int)th) / 2;
  display.setCursor(tx, ty);
  display.print(text);
  display.setTextColor(SH110X_WHITE);
}

// Reusable drawing functions for backward compatibility
void drawShield(int x, int y) {
  display.drawBitmap(x, y, icon_shield_16x16, 16, 16, SH110X_WHITE);
}

void drawCardIcon(int x, int y) {
  display.drawBitmap(x, y, icon_rfid_16x16, 16, 16, SH110X_WHITE);
}

void drawGPSIcon(int x, int y) {
  display.drawBitmap(x, y, icon_gps_pin_12x12, 12, 12, SH110X_WHITE);
}

void drawWarningIcon(int x, int y) {
  display.drawBitmap(x, y, icon_warning_16x16, 16, 16, SH110X_WHITE);
}

void drawUserIcon(int x, int y) {
  display.drawBitmap(x, y, icon_helmet_16x16, 16, 16, SH110X_WHITE);
}

// ============================================================
//                    MOTION SENSOR RAW DRIVER
// ============================================================

void motionWriteByte(byte reg, byte value) {
  Wire.beginTransmission(MOTION_ADDR);
  Wire.write(reg);
  Wire.write(value);
  Wire.endTransmission();
}

byte motionReadByte(byte reg) {
  Wire.beginTransmission(MOTION_ADDR);
  Wire.write(reg);
  if (Wire.endTransmission(false) != 0) return 0xFF;
  Wire.requestFrom(MOTION_ADDR, (uint8_t)1, (uint8_t)true);
  if (Wire.available()) return Wire.read();
  return 0xFF;
}

bool initMotionSensor() {
  byte whoAmI = motionReadByte(WHO_AM_I_REG);
  Serial.print("Motion WHO_AM_I = 0x");
  Serial.println(whoAmI, HEX);

  // Accept 0x68 (MPU6050), 0x70 (MPU6500 clone), 0x71 (MPU9250)
  if (whoAmI != 0x68 && whoAmI != 0x70 && whoAmI != 0x71) {
    Serial.print("Motion sensor identity not recognized: 0x");
    Serial.println(whoAmI, HEX);
    return false;
  }

  // Wake sensor
  motionWriteByte(PWR_MGMT_1_REG, 0x00);
  delay(100);

  // Gyroscope ±500 deg/s
  motionWriteByte(GYRO_CONFIG_REG, 0x08);

  // Accelerometer ±8g
  motionWriteByte(ACCEL_CONFIG_REG, 0x10);

  delay(50);
  Serial.println("Raw motion sensor initialized.");
  return true;
}

// ============================================================
//                    READ 16-BIT REGISTER
// ============================================================

int16_t readMotionInt16() {
  uint8_t highByte = Wire.read();
  uint8_t lowByte  = Wire.read();
  return (int16_t)(((uint16_t)highByte << 8) | lowByte);
}

// ============================================================
//                    READ MOTION SENSOR
// ============================================================

bool readMotionSensor() {
  Wire.beginTransmission(MOTION_ADDR);
  Wire.write(ACCEL_XOUT_H);
  if (Wire.endTransmission(false) != 0) return false;

  uint8_t received = Wire.requestFrom(MOTION_ADDR, (uint8_t)14, (uint8_t)true);
  if (received != 14) return false;

  int16_t rawAx   = readMotionInt16();
  int16_t rawAy   = readMotionInt16();
  int16_t rawAz   = readMotionInt16();
  int16_t rawTemp = readMotionInt16();
  int16_t rawGx   = readMotionInt16();
  int16_t rawGy   = readMotionInt16();
  int16_t rawGz   = readMotionInt16();

  // ±8g = 4096 LSB/g
  accelX = ((float)rawAx / 4096.0) * 9.80665;
  accelY = ((float)rawAy / 4096.0) * 9.80665;
  accelZ = ((float)rawAz / 4096.0) * 9.80665;

  // ±500 deg/s = 65.5 LSB/(deg/s)
  gyroX = (float)rawGx / 65.5;
  gyroY = (float)rawGy / 65.5;
  gyroZ = (float)rawGz / 65.5;

  // Temperature
  motionTemperature = ((float)rawTemp / 340.0) + 36.53;

  // Acceleration magnitude
  accelerationMagnitude = sqrt(
    accelX * accelX + accelY * accelY + accelZ * accelZ
  );

  // Pitch
  pitchAngle = atan2(accelX, sqrt(accelY * accelY + accelZ * accelZ)) * 180.0 / PI;

  // Roll
  rollAngle = atan2(accelY, accelZ) * 180.0 / PI;

  return true;
}

// ============================================================
//                     IMPACT DETECTION
// ============================================================

void checkImpact() {
  if (!motionSensorReady) return;
  if (millis() - lastImpactDetection < 5000) return;

  bool highAcceleration = accelerationMagnitude >= IMPACT_THRESHOLD;
  bool highRotation     = fabs(gyroX) >= GYRO_ALERT_THRESHOLD ||
                          fabs(gyroY) >= GYRO_ALERT_THRESHOLD ||
                          fabs(gyroZ) >= GYRO_ALERT_THRESHOLD;

  if (sessionActive && (highAcceleration || highRotation)) {
    impactAlertActive     = true;
    impactAlertStart      = millis();
    lastImpactDetection   = millis();

    Serial.println("!!! IMPACT ALERT !!!");
    Serial.print("Acceleration: ");
    Serial.println(accelerationMagnitude);

    beepImpact();
    sendAlertToBackend();
  }
}

// ============================================================
//               QUECTEL L86-M33 GPS INITIALIZATION
// ============================================================

void initGPS() {
  Serial.println("Starting Quectel L86-M33 GPS...");
  Serial.printf("  GPS Pins: ESP32 RX=GPIO %d (connects to L86 TXD), ESP32 TX=GPIO %d (connects to L86 RXD)\n",
                GPS_RX_PIN, GPS_TX_PIN);

  // Expand UART buffer to 1024 bytes to prevent buffer overflow during network requests
  GPSSerial.setRxBufferSize(1024);
  GPSSerial.begin(9600, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);

  // Send Quectel L86-M33 PMTK configuration commands
  // 1. Enable Multi-GNSS: GPS + GLONASS + Galileo for maximum satellite visibility
  GPSSerial.println("$PMTK353,1,1,1,0,0*2A");
  delay(40);

  // 2. Enable Quectel EASY (Embedded Assist System) for faster TTFF satellite lock
  GPSSerial.println("$PMTK869,1,1*35");
  delay(40);

  // 3. Set standard NMEA output sentences: RMC, GGA, GSA, GSV
  GPSSerial.println("$PMTK314,0,1,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0*29");
  delay(40);

  // 4. Set 1 Hz update rate
  GPSSerial.println("$PMTK220,1000*1F");
  delay(40);

  // Diagnostic UART check: listen for 1200 ms to confirm L86 is sending NMEA stream
  unsigned long t0 = millis();
  unsigned long initialBytes = 0;
  while (millis() - t0 < 1200) {
    while (GPSSerial.available()) {
      char c = GPSSerial.read();
      gps.encode(c);
      initialBytes++;
      lastGPSCharTime = millis();
    }
    delay(10);
  }

  if (initialBytes == 0) {
    // Check if module is configured for 115200 baud
    GPSSerial.begin(115200, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
    delay(100);
    t0 = millis();
    while (millis() - t0 < 600) {
      while (GPSSerial.available()) {
        char c = GPSSerial.read();
        gps.encode(c);
        initialBytes++;
        lastGPSCharTime = millis();
      }
      delay(10);
    }
    if (initialBytes == 0) {
      // Revert to standard 9600 baud
      GPSSerial.begin(9600, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
    } else {
      Serial.printf("  [GPS OK] L86-M33 communicating on UART at 115200 baud! (%lu bytes)\n", initialBytes);
    }
  }

  if (initialBytes > 0) {
    Serial.printf("  [GPS OK] L86-M33 communicating on UART! (%lu bytes received)\n", initialBytes);
    gpsUartActive = true;
  } else {
    Serial.println("  [GPS WARNING] 0 bytes received from L86-M33 on GPIO 16 (RX)!");
    Serial.println("  Physical Wiring Troubleshooting Guide:");
    Serial.println("    1. L86 TXD -> ESP32 GPIO 16 (RX) (TX must connect to RX!)");
    Serial.println("    2. L86 RXD -> ESP32 GPIO 17 (TX)");
    Serial.println("    3. L86 VCC -> 3.3V or 5V (Check multimeter voltage)");
    Serial.println("    4. L86 GND -> Common GND");
    Serial.println("    5. Common mistake: Connecting L86 TX to ESP32 TX will result in 0 bytes.");
    gpsUartActive = false;
  }
}

// ============================================================
//                         GPS PROCESSING
// ============================================================

void processGPS() {
  while (GPSSerial.available()) {
    char c = GPSSerial.read();
    gps.encode(c);
    lastGPSCharTime = millis();
  }

  gpsUartActive = (millis() - lastGPSCharTime < 8000);

  // Check if GPS produces valid, fresh, non-zero coordinates
  if (gps.location.isValid() && gps.location.age() < 5000 &&
      isValidGeoCoord(gps.location.lat(), gps.location.lng())) {
    consecutiveGpsFixCount++;
    lastValidFixTime = millis();

    // Hysteresis: require 2 consecutive valid samples before declaring GPS lock
    if (consecutiveGpsFixCount >= 2) {
      gpsHasFix = true;
      locationState = LOC_GPS_FIX;
      latitude  = gps.location.lat();
      longitude = gps.location.lng();
      speed     = gps.speed.isValid() ? gps.speed.kmph() : 0.0;

      // Update local cache
      cachedLatitude     = latitude;
      cachedLongitude    = longitude;
      cachedPlaceName    = placeName;
      cachedLocationTime = millis();
      hasCachedLocation  = true;
      locationStatus     = "RESOLVED";
    }
  } else {
    consecutiveGpsFixCount = 0;
    gpsHasFix = false;

    // If fix was lost within 8 seconds and we have cached coordinates, mark as stale GPS
    if (millis() - lastValidFixTime < 8000 && hasCachedLocation) {
      locationState = LOC_GPS_STALE;
    }
  }
}

// ============================================================
//                    GPS QUALITY TEXT
// ============================================================

String gpsStatusText() {
  if (locationState == LOC_GPS_FIX) {
    if (gps.satellites.isValid() && gps.satellites.value() >= 4) return "FIX GOOD";
    return "FIX WEAK";
  }
  if (locationState == LOC_ESTIMATE_READY || locationState == LOC_CACHED) {
    if (locationStatus == "RESOLVED") return "RESOLVED";
    return "APPROXIMATE";
  }
  if (locationState == LOC_GPS_STALE)      return "SIGNAL LOST";
  if (locationState == LOC_WIFI_ESTIMATING) return "ACQUIRING...";
  return "SEARCHING";
}

// ============================================================
//                        WI-FI CONNECT
// ============================================================

void connectWiFi() {
#if ENABLE_WIFI
  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    return;
  }

  Serial.println("Connecting to Wi-Fi...");
  WiFi.disconnect(true);
  delay(100);
  WiFi.mode(WIFI_STA);
  // Reduce TX power from 20dBm to 15dBm to prevent peak current surge / flash brownout
  WiFi.setTxPower(WIFI_POWER_15dBm);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
    delay(250);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    Serial.println("Wi-Fi connected.");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());

    // Subnet check warning
    String espIP      = WiFi.localIP().toString();
    String espSubnet  = espIP.substring(0, espIP.lastIndexOf('.'));
    String backendStr = String(BACKEND_URL);
    int s1            = backendStr.indexOf("//") + 2;
    int s2            = backendStr.indexOf(":", s1);
    String backendIP  = backendStr.substring(s1, s2);
    String backendSub = backendIP.substring(0, backendIP.lastIndexOf('.'));

    if (espSubnet != backendSub) {
      Serial.println("╔══════════════════════════════════════════╗");
      Serial.println("║  ⚠ SUBNET MISMATCH — BACKEND UNREACHABLE ║");
      Serial.println("╠══════════════════════════════════════════╣");
      Serial.print  ("║  ESP32 subnet:   "); Serial.println(espSubnet + ".x");
      Serial.print  ("║  Backend subnet: "); Serial.println(backendSub + ".x");
      Serial.println("║                                          ║");
      Serial.println("║  FIX: Connect laptop to same hotspot,    ║");
      Serial.println("║  run ipconfig, update BACKEND_URL IP.    ║");
      Serial.println("╚══════════════════════════════════════════╝");
    }
  } else {
    wifiConnected = false;
    Serial.println("Wi-Fi connection failed.");
  }
#else
  wifiConnected = false;
  Serial.println("Wi-Fi is DISABLED.");
#endif
}

// ============================================================
//                    WIFI MAINTENANCE
// ============================================================

void maintainWiFi() {
#if ENABLE_WIFI
  if (millis() - lastWiFiCheck < WIFI_INTERVAL) return;
  lastWiFiCheck = millis();

  static bool wasWifiConnected = true;

  if (WiFi.status() != WL_CONNECTED) {
    if (wasWifiConnected) {
      beepOffline();
      Serial.println("WiFi Disconnected!");
    }
    wifiConnected    = false;
    wasWifiConnected = false;
    WiFi.disconnect();
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  } else {
    wifiConnected    = true;
    wasWifiConnected = true;
  }
#endif
}

// ============================================================
//                    URL ENCODING
// ============================================================

String urlEncode(const String& input) {
  String encoded = "";
  const char* hex = "0123456789ABCDEF";
  for (unsigned int i = 0; i < input.length(); i++) {
    char c = input.charAt(i);
    if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
        (c >= '0' && c <= '9') || c == '-' || c == '_' || c == '.' || c == '~') {
      encoded += c;
    } else {
      encoded += '%';
      encoded += hex[(c >> 4) & 0x0F];
      encoded += hex[c & 0x0F];
    }
  }
  return encoded;
}

// ============================================================
//             CONFIDENTIAL WI-FI LOCATION ESTIMATE
// ============================================================

void requestWifiLocationEstimate(int numNetworks) {
#if ENABLE_WIFI
  if (!wifiConnected) return;

  WiFiClient client;
  HTTPClient http;
  http.setTimeout(2000); // 2s bounded timeout

  String url = String(BACKEND_URL) + "/location/estimate";
  if (!http.begin(client, url)) return;

  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<768> reqDoc;
  reqDoc["device"] = "DivyaDrishti";
  JsonArray apArray = reqDoc.createNestedArray("wifiAccessPoints");

  int count = (numNetworks > 0) ? min(numNetworks, 6) : 0;
  for (int i = 0; i < count; i++) {
    JsonObject ap = apArray.createNestedObject();
    ap["bssid"]   = WiFi.BSSIDstr(i);
    ap["rssi"]    = WiFi.RSSI(i);
    ap["channel"] = WiFi.channel(i);
  }

  String payload;
  serializeJson(reqDoc, payload);

  int code = http.POST(payload);
  if (code == 200) {
    String body = http.getString();
    StaticJsonDocument<512> respDoc;
    DeserializationError err = deserializeJson(respDoc, body);
    if (!err && respDoc["success"] == true) {
      double estLat = respDoc["latitude"];
      double estLon = respDoc["longitude"];

      if (isValidGeoCoord(estLat, estLon)) {
        latitude  = estLat;
        longitude = estLon;
        const char* p = respDoc["place"];
        if (p && strlen(p) > 0) {
          placeName = String(p);
        }
        locationStatus = respDoc["locationStatus"] | "APPROXIMATE";
        locationState  = LOC_ESTIMATE_READY;

        // Cache valid estimate
        cachedLatitude     = latitude;
        cachedLongitude    = longitude;
        cachedPlaceName    = placeName;
        cachedLocationTime = millis();
        hasCachedLocation  = true;

        Serial.printf("[Location] Fallback position resolved: %s (Status: %s)\n",
                      placeName.c_str(), locationStatus.c_str());
      }
    }
  }

  http.end();
  client.stop();
#endif
}

// ============================================================
//               MULTI-SOURCE LOCATION COORDINATOR
// ============================================================

void updateLocationManager() {
  // 1. If GPS fix is active, it takes highest priority
  if (locationState == LOC_GPS_FIX) {
    return;
  }

  // 2. If Wi-Fi is connected and GPS is offline, run non-blocking Wi-Fi scan
#if ENABLE_WIFI
  if (wifiConnected && (millis() - lastWifiEstimateRequest >= WIFI_SCAN_INTERVAL)) {
    if (wifiScanState == SCAN_IDLE) {
      WiFi.scanNetworks(true, false); // Asynchronous scan
      wifiScanState = SCAN_RUNNING;
      lastWifiScanStart = millis();
      if (locationState != LOC_ESTIMATE_READY && locationState != LOC_CACHED) {
        locationState = LOC_WIFI_ESTIMATING;
      }
    }
  }

  if (wifiScanState == SCAN_RUNNING) {
    int scanResult = WiFi.scanComplete();
    if (scanResult >= 0) {
      requestWifiLocationEstimate(scanResult);
      WiFi.scanDelete();
      wifiScanState = SCAN_IDLE;
      lastWifiEstimateRequest = millis();
    } else if (scanResult == WIFI_SCAN_FAILED || millis() - lastWifiScanStart > 8000) {
      WiFi.scanDelete();
      wifiScanState = SCAN_IDLE;
      lastWifiEstimateRequest = millis();
    }
  }
#endif

  // 3. Fallback to cached location if available
  if (locationState != LOC_GPS_FIX && locationState != LOC_ESTIMATE_READY) {
    if (hasCachedLocation && (millis() - cachedLocationTime < 30UL * 60UL * 1000UL)) {
      locationState = LOC_CACHED;
      latitude      = cachedLatitude;
      longitude     = cachedLongitude;
      if (placeName.length() == 0 || placeName == "Searching for location...") {
        placeName = cachedPlaceName;
      }
      locationStatus = "APPROXIMATE";
    } else {
      locationState = LOC_UNAVAILABLE;
      locationStatus = "UNAVAILABLE";
    }
  }
}

// ============================================================
//                      MQ3 PROCESSING
// ============================================================

void readMQ3() {
  mq3Value = analogRead(MQ3_PIN);
}

// ============================================================
//                       RFID UID CHECK
// ============================================================

bool compareUID(byte* readUID, byte* knownUID, byte length) {
  if (length != 4) return false;
  for (byte i = 0; i < 4; i++) {
    if (readUID[i] != knownUID[i]) return false;
  }
  return true;
}

// ============================================================
//                    START RIDING SESSION
// ============================================================

void startAuthorizedSession() {
  sessionActive      = true;
  sessionStartTime   = millis();
  authSuccessScreen  = true;
  authSuccessStart   = millis();
  unauthorizedScreen = false;
  currentPage        = PAGE_DASHBOARD;
  lastPageChange     = millis();
  beepAuthorized();
  Serial.println("AUTHORIZED SESSION STARTED");
}

// ============================================================
//                    RFID PROCESSING
// ============================================================

void processRFID() {
  // Case 1: No card detected in RF field
  if (!rfid.PICC_IsNewCardPresent()) {
    return;
  }

  // Case 2: Card detected in RF field, but UID read failed
  if (!rfid.PICC_ReadCardSerial()) {
    Serial.println("[RFID DIAGNOSTIC] Card signal detected in RF field, but UID could not be read!");
    Serial.println("                 Possible causes: incompatible card (e.g. 125 kHz tag), fast removal, or weak coupling.");
    return;
  }

  // Case 3: UID successfully read — determine card details
  beepCardDetected();

  String uidStr = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) {
      uidStr += "0";
    }
    uidStr += String(rfid.uid.uidByte[i], HEX);
    if (i < rfid.uid.size - 1) {
      uidStr += " ";
    }
  }
  uidStr.toUpperCase();

  MFRC522::PICC_Type piccType = rfid.PICC_GetType(rfid.uid.sak);
  Serial.printf("[RFID] Card read successfully! UID: %s | Size: %d bytes | SAK: 0x%02X | Type: %s\n",
                uidStr.c_str(), rfid.uid.size, rfid.uid.sak, rfid.PICC_GetTypeName(piccType));

  // Forward UID to Backend for Authorization
  if (WiFi.status() == WL_CONNECTED) {
    WiFiClient client;
    HTTPClient http;
    http.setTimeout(1500);

    String url = String(BACKEND_URL) + "/auth/rfid";

    if (http.begin(client, url)) {
      http.addHeader("Content-Type", "application/json");
      String payload = "{\"rfid\":\"" + uidStr + "\",\"deviceId\":\"ESP32_HELMET_01\"}";
      int code = http.POST(payload);

      Serial.printf("[RFID] POST /auth/rfid → %d\n", code);

      if (code == 200) {
        Serial.println("[RFID] Backend authorization SUCCESS: Rider Authorized!");
        unauthorizedScreen = false;
        startAuthorizedSession();
      } else if (code < 0) {
        Serial.printf("[RFID DIAGNOSTIC] Backend unreachable (%s) — falling back to local UID check\n",
                      HTTPClient::errorToString(code).c_str());
        if (compareUID(rfid.uid.uidByte, AUTH_UID, rfid.uid.size)) {
          Serial.println("[RFID] Local fallback MATCH: Rider Authorized!");
          unauthorizedScreen = false;
          startAuthorizedSession();
        } else {
          Serial.println("[RFID DIAGNOSTIC] UID read successfully, but REJECTED by local policy: Unauthorized card.");
          unauthorizedScreen = true;
          unauthorizedStart  = millis();
          beepUnauthorized();
        }
      } else {
        Serial.printf("[RFID DIAGNOSTIC] UID read successfully, but REJECTED by backend (HTTP %d): Unauthorized card.\n", code);
        unauthorizedScreen = true;
        unauthorizedStart  = millis();
        beepUnauthorized();
      }
      http.end();
      client.stop();
    }
  } else {
    Serial.println("[RFID] WiFi offline — falling back to local UID check");
    if (compareUID(rfid.uid.uidByte, AUTH_UID, rfid.uid.size)) {
      Serial.println("[RFID] Local fallback MATCH: Rider Authorized!");
      unauthorizedScreen = false;
      startAuthorizedSession();
    } else {
      Serial.println("[RFID DIAGNOSTIC] UID read successfully, but REJECTED by local policy: Unauthorized card.");
      unauthorizedScreen = true;
      unauthorizedStart  = millis();
      beepUnauthorized();
    }
  }

  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
}

// ============================================================
//                    SESSION MANAGEMENT
// ============================================================

void updateSession() {
  if (!sessionActive) return;
  unsigned long elapsed = millis() - sessionStartTime;
  if (elapsed >= SESSION_DURATION) {
    sessionActive  = false;
    Serial.println("Riding session expired.");
    currentPage    = PAGE_DASHBOARD;
    lastPageChange = millis();
  }
}

unsigned long sessionRemaining() {
  if (!sessionActive) return 0;
  unsigned long elapsed = millis() - sessionStartTime;
  if (elapsed >= SESSION_DURATION) return 0;
  return SESSION_DURATION - elapsed;
}

String formatTime(unsigned long milliseconds) {
  unsigned long totalSeconds = milliseconds / 1000;
  unsigned int hours   = totalSeconds / 3600;
  unsigned int minutes = (totalSeconds % 3600) / 60;
  unsigned int seconds = totalSeconds % 60;
  char buffer[12];
  sprintf(buffer, "%02u:%02u:%02u", hours, minutes, seconds);
  return String(buffer);
}

// ============================================================
//                  STARTUP / BOOT SCREEN
// ============================================================

void showStartupScreen(const char* stepName, int progressPercent) {
  clearOLED();
  display.drawBitmap(10, 10, icon_shield_16x16, 16, 16, SH110X_WHITE);
  display.setTextSize(1);
  display.setCursor(32, 10);
  display.print("DIVYADRISHTI");
  display.setCursor(32, 20);
  display.print("SMART HELMET v2");

  drawDivider(32);

  display.setCursor(8, 38);
  display.print(stepName);

  drawProgressBar(8, 50, 112, 8, progressPercent);
  display.display();
}

// ============================================================
//            STANDBY / LOCKED: SCAN RFID CARD SCREEN
// ============================================================

void showScanRfidScreen() {
  clearOLED();
  drawHeader("DIVYADRISHTI");

  // Status security pill
  drawBadge(12, 14, 104, 11, "HELMET LOCKED", false);

  // Central interactive RFID scanning card box
  display.drawRoundRect(14, 27, 100, 23, 3, SH110X_WHITE);
  display.drawBitmap(20, 30, icon_rfid_16x16, 16, 16, SH110X_WHITE);

  display.setTextSize(1);
  display.setCursor(42, 30);
  display.print("SCAN RFID");
  display.setCursor(42, 40);
  display.print("TO UNLOCK");

  // Bottom prompt or hardware status
  if (rfidReady) {
    centerText("TAP AUTHORIZED TAG", 53, 1);
  } else {
    centerText("! RFID SENSOR FAULT !", 53, 1);
  }

  display.display();
}

// ============================================================
//                 PAGE 0: DASHBOARD HERO SCREEN
// ============================================================

void showDashboardScreen() {
  clearOLED();
  drawHeader("DIVYADRISHTI");

  // Status Badge / Pill
  if (sessionActive) {
    drawBadge(4, 15, 120, 12, "RIDE ACTIVE", true);
  } else {
    drawBadge(4, 15, 120, 12, "SYSTEM READY", false);
  }

  // Two Compact Sensor Glance Cards
  // Card 1: Network / Cloud
  display.drawRoundRect(4, 30, 58, 20, 2, SH110X_WHITE);
  display.drawBitmap(7, 34, icon_wifi_12x12, 12, 12, SH110X_WHITE);
  display.setTextSize(1);
  display.setCursor(22, 36);
  display.print(wifiConnected ? "NET:OK" : "NET:OFF");

  // Card 2: GPS Fix
  display.drawRoundRect(66, 30, 58, 20, 2, SH110X_WHITE);
  display.drawBitmap(69, 34, icon_gps_pin_12x12, 12, 12, SH110X_WHITE);
  display.setTextSize(1);
  display.setCursor(84, 36);
  if (gpsHasFix) {
    display.print("GPS:FIX");
  } else if (locationStatus == "RESOLVED") {
    display.print("LOC:OK");
  } else {
    display.print("GPS:---");
  }

  // Bottom action banner
  if (sessionActive) {
    centerText("LIVE SENSORS ARMED", 54, 1);
  } else {
    centerText("TAP RFID TO BEGIN", 54, 1);
  }
  display.display();
}

// ============================================================
//                 PAGE 1: RIDER PROFILE SCREEN
// ============================================================

void showRiderScreen() {
  clearOLED();
  drawHeader("RIDER PROFILE");

  // Left helmet silhouette
  display.drawBitmap(6, 16, icon_helmet_16x16, 16, 16, SH110X_WHITE);

  // Rider info
  display.setTextSize(1);
  display.setCursor(26, 16);
  display.print("RIDER");
  display.setCursor(26, 25);
  display.print(RIDER_NAME);

  // Verified Badge
  drawBadge(76, 16, 48, 11, "VERIFIED", true);

  drawDivider(37);

  display.setCursor(6, 42);
  display.print("TEL:");
  display.print(RIDER_PHONE);

  display.setCursor(6, 53);
  display.print("SOS:");
  display.print(FAMILY_PHONE);

  display.display();
}

// ============================================================
//                 PAGE 2: RIDE SESSION SCREEN
// ============================================================

void showSessionScreen() {
  clearOLED();
  drawHeader("RIDE SESSION");

  if (!sessionActive) {
    display.drawBitmap(56, 16, icon_rfid_16x16, 16, 16, SH110X_WHITE);
    centerText("SESSION STANDBY", 36, 1);
    centerText("SCAN RFID TO START", 48, 1);
    display.display();
    return;
  }

  unsigned long remaining = sessionRemaining();
  unsigned long elapsed   = SESSION_DURATION - remaining;
  int percent = (elapsed * 100UL) / SESSION_DURATION;

  centerText("TIME REMAINING", 15, 1);
  centerText(formatTime(remaining), 26, 2);

  drawProgressBar(6, 45, 116, 7, 100 - percent);

  display.setTextSize(1);
  display.setCursor(6, 55);
  display.print("1 HR SESSION");

  display.setCursor(84, 55);
  display.print(100 - percent);
  display.print("% REM");

  display.display();
}

// ============================================================
//                 PAGE 3: LIVE LOCATION SCREEN
// ============================================================

void showLocationScreen() {
  clearOLED();
  drawHeader("LIVE LOCATION");

  display.drawBitmap(4, 15, icon_gps_pin_12x12, 12, 12, SH110X_WHITE);

  if (locationState == LOC_GPS_FIX) {
    display.setTextSize(1);
    display.setCursor(19, 16);
    display.print(gpsStatusText());

    display.setCursor(80, 16);
    display.printf("SAT:%d", gps.satellites.isValid() ? (int)gps.satellites.value() : 0);

    String loc = placeName;
    if (loc.length() == 0) loc = "Searching location...";

    display.setCursor(4, 28);
    if (loc.length() > 20) {
      int splitIdx = loc.indexOf(',');
      if (splitIdx <= 0 || splitIdx > 20) splitIdx = loc.lastIndexOf(' ', 20);
      if (splitIdx <= 0) splitIdx = 19;
      String line1 = loc.substring(0, splitIdx);
      String line2 = loc.substring(splitIdx + 1);
      line2.trim();
      display.print(line1.substring(0, min((int)line1.length(), 20)));
      display.setCursor(4, 39);
      display.print(line2.substring(0, min((int)line2.length(), 20)));
    } else {
      display.print(loc);
      display.setCursor(4, 39);
      display.printf("%.4f, %.4f", latitude, longitude);
    }

    drawDivider(50);
    display.setCursor(4, 53);
    display.printf("SPD:%.1fkm/h", speed);
    display.setCursor(76, 53);
    display.printf("HDOP:%.1f", gps.hdop.isValid() ? gps.hdop.hdop() : 9.9);

  } else if (locationState == LOC_ESTIMATE_READY || locationState == LOC_CACHED) {
    display.setTextSize(1);
    display.setCursor(19, 16);
    if (locationStatus == "RESOLVED") {
      display.print("RESOLVED");
      display.setCursor(84, 16);
      display.print("ACC");
    } else {
      display.print("APPROXIMATE");
      display.setCursor(84, 16);
      display.print("EST");
    }

    String loc = placeName;
    if (loc.length() == 0) loc = "Searching location...";

    display.setCursor(4, 28);
    if (loc.length() > 20) {
      int splitIdx = loc.indexOf(',');
      if (splitIdx <= 0 || splitIdx > 20) splitIdx = loc.lastIndexOf(' ', 20);
      if (splitIdx <= 0) splitIdx = 19;
      String line1 = loc.substring(0, splitIdx);
      String line2 = loc.substring(splitIdx + 1);
      line2.trim();
      display.print(line1.substring(0, min((int)line1.length(), 20)));
      display.setCursor(4, 39);
      display.print(line2.substring(0, min((int)line2.length(), 20)));
    } else {
      display.print(loc);
      display.setCursor(4, 39);
      display.printf("%.4f, %.4f", latitude, longitude);
    }

    drawDivider(50);
    if (locationStatus == "RESOLVED") {
      drawBadge(12, 52, 104, 10, "LOCATION RESOLVED", true);
    } else {
      drawBadge(12, 52, 104, 10, "LOCATION APPROXIMATE", false);
    }

  } else {
    display.setTextSize(1);
    display.setCursor(19, 16);
    display.print(!gpsUartActive ? "GPS FAULT" : "SEARCHING");

    display.setCursor(80, 16);
    display.print("SAT: 0");

    centerText(!gpsUartActive ? "CHECK GPS MODULE" : "GPS SIGNAL SEARCHING", 32, 1);
    centerText("Keep helmet outdoors", 43, 1);

    drawBadge(14, 53, 100, 10, "ANTENNA ACTIVE", false);
  }

  display.display();
}

// ============================================================
//                 PAGE 4: SAFETY & AIR SCREEN
// ============================================================

void showSafetyScreen() {
  clearOLED();
  drawHeader("SAFETY & AIR");

  // Determine MQ-3 Air Condition
  const char* airStatus = "AIR: CLEAN";
  if (mq3Value >= MQ3_CAUTION_THRESHOLD) {
    airStatus = "AIR: ALERT";
  } else if (mq3Value >= MQ3_CLEAN_THRESHOLD) {
    airStatus = "AIR: CAUTION";
  }

  // Top Card: Gas / Air Monitor
  display.drawRoundRect(4, 14, 120, 23, 2, SH110X_WHITE);
  display.setTextSize(1);
  display.setCursor(8, 17);
  display.print(airStatus);
  display.setCursor(78, 17);
  display.printf("ADC:%d", mq3Value);
  display.setCursor(8, 27);
  display.print("Raw uncalibrated ADC");

  // Bottom Card: Motion & Tilt Dynamics
  display.drawRoundRect(4, 39, 120, 23, 2, SH110X_WHITE);
  display.setCursor(8, 42);
  if (!motionSensorReady) {
    display.print("MOTION: FAULT");
  } else if (accelerationMagnitude > 2.5) {
    display.print("MOTION: ROUGH");
  } else if (accelerationMagnitude > 1.3) {
    display.print("MOTION: ACTIVE");
  } else {
    display.print("MOTION: SMOOTH");
  }

  display.setCursor(80, 42);
  display.printf("%.1fG", accelerationMagnitude);

  display.setCursor(8, 52);
  display.printf("P:%+.0f  R:%+.0f", pitchAngle, rollAngle);
  display.setCursor(76, 52);
  display.printf("%.1f C", motionTemperature);

  display.display();
}

// ============================================================
//                 PAGE 5: MOTION MONITOR SCREEN
// ============================================================

void showMotionScreen() {
  clearOLED();
  drawHeader("MOTION MONITOR");

  if (!motionSensorReady) {
    drawWarningIcon(56, 15);
    centerText("MOTION SENSOR FAULT", 34, 1);
    centerText("Check I2C connections", 46, 1);
    centerText("ADDR: 0x68 / 0x70", 56, 1);
    display.display();
    return;
  }

  // Large G-force readout
  display.setTextSize(1);
  display.setCursor(6, 16);
  display.print("TOTAL ACCEL");

  display.setTextSize(2);
  display.setCursor(6, 27);
  display.printf("%.2fG", accelerationMagnitude);

  // Right column: Pitch, Roll, Gyro Rate
  display.setTextSize(1);
  display.setCursor(74, 16);
  display.printf("P: %+.0f", pitchAngle);

  display.setCursor(74, 26);
  display.printf("R: %+.0f", rollAngle);

  float gyroRate = sqrt(gyroX * gyroX + gyroY * gyroY + gyroZ * gyroZ);
  display.setCursor(74, 36);
  display.printf("W: %.0f", gyroRate);

  drawDivider(48);

  if (impactAlertActive) {
    drawBadge(4, 51, 120, 11, "! IMPACT DETECTED !", true);
  } else {
    drawBadge(4, 51, 120, 11, "25G CRASH GUARD ARMED", false);
  }

  display.display();
}

// ============================================================
//                 PAGE 6: DIAGNOSTICS SCREEN
// ============================================================

void showDiagnosticsScreen() {
  clearOLED();
  drawHeader("DIAGNOSTICS");

  display.setTextSize(1);

  // Line 1: Wi-Fi
  display.setCursor(4, 15);
  display.print("WIFI:");
  display.setCursor(50, 15);
  display.print(wifiConnected ? "CONNECTED" : "OFFLINE");

  // Line 2: Cloud Backend
  display.setCursor(4, 27);
  display.print("CLOUD:");
  display.setCursor(50, 27);
  if (backendConnected) {
    display.printf("ONLINE (%d)", lastBackendStatus);
  } else if (wifiConnected) {
    display.print("CONNECTING...");
  } else {
    display.print("DISCONNECTED");
  }

  // Line 3: GPS Status
  display.setCursor(4, 39);
  display.print("GPS:");
  display.setCursor(50, 39);
  if (locationState == LOC_GPS_FIX) {
    display.printf("LOCK (%d SAT)", gps.satellites.isValid() ? (int)gps.satellites.value() : 0);
  } else if (!gpsUartActive) {
    display.print("UART FAULT");
  } else if (locationState == LOC_ESTIMATE_READY) {
    display.print("APPROX LOCK");
  } else {
    display.print("SEARCHING");
  }

  // Line 4: IMU & RFID Hardware Status
  display.setCursor(4, 51);
  display.print("STATUS:");
  display.setCursor(50, 51);
  display.printf("IMU:%s RFID:%s", motionSensorReady ? "OK" : "ERR", rfidReady ? "OK" : "ERR");

  display.display();
}

// ============================================================
//            PRIORITY OVERRIDE 1: AUTH SUCCESS SCREEN
// ============================================================

void showAuthSuccessScreen() {
  clearOLED();
  drawBadge(16, 4, 96, 12, "ACCESS GRANTED", true);
  display.drawBitmap(56, 19, icon_success_16x16, 16, 16, SH110X_WHITE);
  centerText("RIDER: " + String(RIDER_NAME), 38, 1);
  drawDivider(48);
  centerText("SESSION STARTED (1 HR)", 53, 1);
  display.display();
}

// ============================================================
//            PRIORITY OVERRIDE 2: UNAUTHORIZED SCREEN
// ============================================================

void showUnauthorizedScreen() {
  clearOLED();
  display.drawBitmap(56, 6, icon_warning_16x16, 16, 16, SH110X_WHITE);
  centerText("ACCESS DENIED", 26, 1);
  drawDivider(37);
  centerText("UNREGISTERED CARD", 42, 1);
  centerText("SCAN VALID KEY", 53, 1);
  display.display();
}

// ============================================================
//            PRIORITY OVERRIDE 3: IMPACT EMERGENCY SCREEN
// ============================================================

void showImpactScreen() {
  clearOLED();
  // Futuristic emergency flashing double-border
  display.drawRect(1, 1, 126, 62, SH110X_WHITE);
  display.drawRect(3, 3, 122, 58, SH110X_WHITE);

  display.drawBitmap(56, 7, icon_warning_16x16, 16, 16, SH110X_WHITE);

  centerText("! IMPACT DETECTED !", 27, 1);
  centerText("FAMILY & CLOUD NOTIFIED", 39, 1);
  centerText("CHECK RIDER SAFETY", 51, 1);
  display.display();
}

// ============================================================
//                     OLED CONTROLLER
// ============================================================

void updateOLED() {
  if (millis() - lastDisplayUpdate < DISPLAY_INTERVAL) return;
  lastDisplayUpdate = millis();

  // Priority Screen Overrides
  if (impactAlertActive)  { showImpactScreen();       return; }
  if (unauthorizedScreen) { showUnauthorizedScreen(); return; }
  if (authSuccessScreen)  { showAuthSuccessScreen();  return; }

  // Stay at Scan RFID Screen until authorized RFID card unlocks the helmet!
  if (!sessionActive) {
    showScanRfidScreen();
    return;
  }

  // Automatic Smooth Page Rotation (active ONLY during authorized riding session)
  if (millis() - lastPageChange >= PAGE_INTERVAL) {
    lastPageChange = millis();
    currentPage = (ScreenPage)(((int)currentPage + 1) % PAGE_COUNT);
  }

  switch (currentPage) {
    case PAGE_DASHBOARD:   showDashboardScreen();   break;
    case PAGE_RIDER:       showRiderScreen();       break;
    case PAGE_SESSION:     showSessionScreen();     break;
    case PAGE_LOCATION:    showLocationScreen();    break;
    case PAGE_SAFETY:      showSafetyScreen();      break;
    case PAGE_MOTION:      showMotionScreen();      break;
    case PAGE_DIAGNOSTICS: showDiagnosticsScreen(); break;
    default:               showDashboardScreen();   break;
  }
}

// ============================================================
//               SPECIAL SCREENS TIMEOUT HANDLER
// ============================================================

void updateSpecialScreens() {
  if (unauthorizedScreen) {
    if (millis() - unauthorizedStart >= 4000) {
      unauthorizedScreen = false;
      currentPage        = PAGE_DASHBOARD;
      lastPageChange     = millis();
    }
  }

  if (authSuccessScreen) {
    if (millis() - authSuccessStart >= 3500) {
      authSuccessScreen = false;
      currentPage        = PAGE_SESSION;
      lastPageChange     = millis();
    }
  }
}

// ============================================================
//                    BACKEND TELEMETRY
// ============================================================

void sendTelemetryToBackend() {
#if USE_BACKEND
  if (!wifiConnected) return;
  if (millis() - lastBackendSend < BACKEND_INTERVAL) return;
  lastBackendSend = millis();

  WiFiClient client;
  HTTPClient http;
  http.setTimeout(2000);

  String url = String(BACKEND_URL) + "/telemetry";

  if (!http.begin(client, url)) {
    Serial.println("[Telemetry] http.begin failed");
    return;
  }

  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<512> doc;
  doc["device"]        = "DivyaDrishti";
  doc["rider"]         = RIDER_NAME;
  doc["sessionActive"] = sessionActive;

  // GPS
  doc["latitude"]       = latitude;
  doc["longitude"]      = longitude;
  doc["place"]          = placeName;
  doc["speed"]          = speed;
  doc["gpsFix"]         = gpsHasFix;
  doc["locationStatus"] = locationStatus;

  // IMU
  doc["accelX"]        = accelX;
  doc["accelY"]        = accelY;
  doc["accelZ"]        = accelZ;
  doc["gyroX"]         = gyroX;
  doc["gyroY"]         = gyroY;
  doc["gyroZ"]         = gyroZ;
  doc["pitch"]         = pitchAngle;
  doc["roll"]          = rollAngle;
  doc["accMagnitude"]  = accelerationMagnitude;
  doc["temperature"]   = motionTemperature;

  // MQ3
  doc["mq3"]           = mq3Value;

  // Status
  doc["wifi"]          = wifiConnected;
  doc["emergency"]     = impactAlertActive;

  String payload;
  serializeJson(doc, payload);

  int response = http.POST(payload);

  if (response > 0) {
    backendConnected  = true;
    lastBackendStatus = response;
    Serial.printf("[Telemetry] POST /api/telemetry → %d\n", response);
    String body = http.getString();

    StaticJsonDocument<384> respDoc;
    DeserializationError err = deserializeJson(respDoc, body);

    if (!err) {
      if (respDoc.containsKey("place")) {
        const char* p = respDoc["place"];
        if (p && strlen(p) > 0) {
          placeName = String(p);
          cachedPlaceName = placeName;
        }
      }

      if (respDoc.containsKey("locationStatus")) {
        const char* ls = respDoc["locationStatus"];
        if (ls && strlen(ls) > 0) {
          locationStatus = String(ls);
          if (!gpsHasFix && locationState != LOC_GPS_FIX) {
            locationState = LOC_ESTIMATE_READY;
          }
        }
      }

      if (respDoc.containsKey("risk")) {
        const char* risk  = respDoc["risk"] | "LOW";
        const char* event = respDoc["event"] | "NORMAL";

        Serial.printf("Backend AI → Event: %s | Risk: %s\n", event, risk);

        if (strcmp(risk, "MEDIUM") == 0) {
          buzzerTone(523, 100);
          delay(50);
          buzzerTone(659, 150);
        } else if (strcmp(risk, "HIGH") == 0) {
          buzzerTone(880, 80);
          delay(60);
          buzzerTone(880, 80);
          delay(60);
          buzzerTone(880, 120);
        } else if (strcmp(risk, "CRITICAL") == 0) {
          beepImpact();
        }
      }
    }
  } else {
    backendConnected  = false;
    lastBackendStatus = response;
    Serial.printf("[Telemetry] POST FAILED — %s\n",
                  HTTPClient::errorToString(response).c_str());
    Serial.printf("[Telemetry] Target URL: %s\n", url.c_str());
    Serial.printf("[Telemetry] ESP32 IP:   %s\n",
                  WiFi.localIP().toString().c_str());
  }

  http.end();
  client.stop();
#endif
}

// ============================================================
//                       ALERT TO BACKEND
// ============================================================

void sendAlertToBackend() {
#if USE_BACKEND
  if (!wifiConnected) return;

  WiFiClient client;
  HTTPClient http;
  http.setTimeout(2000);

  String url = String(BACKEND_URL) + "/emergency";

  if (!http.begin(client, url)) return;

  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<512> doc;
  doc["device"]        = "DivyaDrishti";
  doc["type"]          = "IMPACT";
  doc["rider"]         = RIDER_NAME;
  doc["phone"]         = RIDER_PHONE;
  doc["familyContact"] = FAMILY_PHONE;
  doc["latitude"]      = latitude;
  doc["longitude"]     = longitude;
  doc["place"]         = placeName;
  doc["acceleration"]  = accelerationMagnitude;
  doc["gyroX"]         = gyroX;
  doc["gyroY"]         = gyroY;
  doc["gyroZ"]         = gyroZ;

  String payload;
  serializeJson(doc, payload);

  int response = http.POST(payload);
  if (response > 0) {
    backendConnected  = true;
    lastBackendStatus = response;
    Serial.printf("[Alert] POST /api/emergency → %d\n", response);
  } else {
    backendConnected  = false;
    lastBackendStatus = response;
    Serial.printf("[Alert] POST FAILED — %s\n",
                  HTTPClient::errorToString(response).c_str());
  }

  http.end();
  client.stop();
#endif
}

// ============================================================
//                       SERIAL STATUS
// ============================================================

void printStatus() {
  Serial.println();
  Serial.println("========== DIVYADRISHTI ==========");
  Serial.print("WiFi: ");
  Serial.println(wifiConnected ? "CONNECTED" : "OFFLINE");
  Serial.print("GPS: ");
  Serial.println(gpsHasFix ? "FIX" : "SEARCHING");

  if (gpsHasFix) {
    Serial.print("Latitude: ");
    Serial.println(latitude, 6);
    Serial.print("Longitude: ");
    Serial.println(longitude, 6);
    Serial.print("Place: ");
    Serial.println(placeName);
  }

  Serial.print("MQ3: ");
  Serial.println(mq3Value);
  Serial.printf("ACC: %.2f, %.2f, %.2f\n", accelX, accelY, accelZ);
  Serial.printf("GYRO: %.2f, %.2f, %.2f\n", gyroX, gyroY, gyroZ);
  Serial.printf("Pitch: %.1f | Roll: %.1f\n", pitchAngle, rollAngle);
  Serial.print("Session: ");
  Serial.println(sessionActive ? "ACTIVE" : "INACTIVE");
  Serial.printf("RFID: %s (v0x%02X)\n", rfidReady ? "READY" : "COMM FAULT", rfidHardwareVersion);

  Serial.printf("GPS Debug → Chars:%lu Passed:%lu Failed:%lu Highs/Lows:%ld/%ld\n",
    gps.charsProcessed(), gps.passedChecksum(), gps.failedChecksum(),
    debugHighs, debugLows);

  Serial.println("==================================");
}

// ============================================================
//                          SETUP
// ============================================================

void setup() {
  Serial.begin(115200);
  delay(500);

  // Start Quectel L86-M33 GPS with PMTK commands and buffer expansion
  initGPS();

  Serial.println();
  Serial.println("==================================");
  Serial.println("     DIVYADRISHTI SMART HELMET");
  Serial.println("==================================");

  // GPIO
  pinMode(MQ3_PIN,    INPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  // I2C
  Wire.begin(I2C_SDA, I2C_SCL);
  Wire.setClock(400000);

  // OLED
  Serial.println("Starting OLED...");
  if (!display.begin(0x3C, true)) {
    Serial.println("OLED initialization failed.");
    while (true) delay(1000);
  }
  display.clearDisplay();
  display.setTextColor(SH110X_WHITE);

  showStartupScreen("INIT HARDWARE...", 20);
  beepStartup();

  // RFID
  showStartupScreen("STARTING RFID...", 45);
  Serial.println("Starting RFID reader...");
  Serial.printf("  SPI Pins configured: SCK=%d, MISO=%d, MOSI=%d, SS=%d, RST=%d\n",
                RFID_SCK_PIN, RFID_MISO_PIN, RFID_MOSI_PIN, RFID_SS_PIN, RFID_RST_PIN);

  // Set CS high initially
  pinMode(RFID_SS_PIN, OUTPUT);
  digitalWrite(RFID_SS_PIN, HIGH);

  // Perform clean hardware reset pulse on RST pin
  pinMode(RFID_RST_PIN, OUTPUT);
  digitalWrite(RFID_RST_PIN, LOW);
  delay(10);
  digitalWrite(RFID_RST_PIN, HIGH);
  delay(50); // Oscillator startup delay

  // Initialize ESP32 SPI bus with software CS control
  SPI.begin(RFID_SCK_PIN, RFID_MISO_PIN, RFID_MOSI_PIN, -1);

  // Initialize MFRC522 transceiver
  rfid.PCD_Init(RFID_SS_PIN, RFID_RST_PIN);
  delay(10);

  // Read firmware version register
  rfidHardwareVersion = rfid.PCD_ReadRegister(MFRC522::PCD_Register::VersionReg);
  Serial.printf("  MFRC522 Version Register: 0x%02X ", rfidHardwareVersion);

  switch (rfidHardwareVersion) {
    case 0x91:
      Serial.println("-> NXP Genuine MFRC522 v1.0 (Functional)");
      rfidReady = true;
      break;
    case 0x92:
      Serial.println("-> NXP Genuine MFRC522 v2.0 (Functional)");
      rfidReady = true;
      break;
    case 0x88:
      Serial.println("-> FM17522 clone (Functional)");
      rfidReady = true;
      break;
    case 0x12:
      Serial.println("-> Counterfeit/Clone chip (Functional)");
      rfidReady = true;
      break;
    case 0x90:
      Serial.println("-> Version 0.0 early revision (Functional)");
      rfidReady = true;
      break;
    case 0x00:
    case 0xFF:
    default:
      Serial.println("-> [ERROR: SPI Communication Failure!]");
      Serial.println("  ***************************************************");
      Serial.println("  [RFID WIRING & POWER TROUBLESHOOTING]");
      Serial.println("  1. VCC: Verify MFRC522 is connected to 3.3V (NOT 5V).");
      Serial.println("  2. GND: Ensure common GND between ESP32 and MFRC522.");
      Serial.println("  3. SPI PINS: SDA=5, RST=4, SCK=18, MOSI=23, MISO=19.");
      Serial.println("  4. Ensure header pins are firmly seated or soldered.");
      Serial.println("  ***************************************************");
      rfidReady = false;
      break;
  }

  if (rfidReady) {
    // Boost antenna receiver sensitivity to maximum (+15 dB gain boost)
    rfid.PCD_SetAntennaGain(MFRC522::RxGain_max);
    rfid.PCD_AntennaOn();
    Serial.println("  RFID ready (Antenna gain set to maximum 48 dB).");
  } else {
    Serial.println("  RFID NOT ready — card scans will be unavailable until SPI/wiring is restored.");
  }

  // Motion sensor
  showStartupScreen("STARTING IMU...", 70);
  Serial.println("Starting raw motion sensor...");
  motionSensorReady = initMotionSensor();
  if (motionSensorReady) {
    Serial.println("Motion sensor READY.");
  } else {
    Serial.println("Motion sensor NOT READY.");
  }

  // Wi-Fi
  showStartupScreen("CONNECTING WI-FI...", 85);
  connectWiFi();

  systemReady = true;
  Serial.println("DivyaDrishti is READY.");

  showStartupScreen("SYSTEM READY!", 100);
  delay(1200);
}

// ============================================================
//                           LOOP
// ============================================================

void loop() {
  processGPS();            // feed TinyGPS++ continuously
  processRFID();           // non-blocking RFID card check
  updateLocationManager(); // multi-source location failover & Wi-Fi scan worker

  // Motion sensor read
  if (millis() - lastMotionUpdate >= MOTION_INTERVAL) {
    lastMotionUpdate = millis();
    if (motionSensorReady) readMotionSensor();
    checkImpact();
  }

  // MQ3 read
  if (millis() - lastMQUpdate >= MQ_INTERVAL) {
    lastMQUpdate = millis();
    readMQ3();
  }

  // Impact alert auto-clear after 8s
  if (impactAlertActive && millis() - impactAlertStart >= 8000) {
    impactAlertActive = false;
  }

  updateSpecialScreens();
  updateSession();
  updateOLED();
  maintainWiFi();
  sendTelemetryToBackend();
}
