// ============================================================
//   DIVYADRISHTI — ISOLATED MFRC522 RFID HARDWARE DIAGNOSTIC
// ============================================================
//
// Purpose:
// Minimal isolated diagnostic tool to test MFRC522 wiring,
// SPI communication, version register, antenna sensitivity,
// and card/tag detection independently of OLED, GPS, and Wi-Fi.
//
// Wiring:
// | MFRC522 Pin | ESP32 Pin | Note                          |
// |-------------|-----------|-------------------------------|
// | 3.3V        | 3.3V      | DO NOT CONNECT TO 5V!         |
// | RST         | GPIO 4    | Reset / Power-down            |
// | GND         | GND       | Common ground                 |
// | MISO        | GPIO 19   | SPI MISO                      |
// | MOSI        | GPIO 23   | SPI MOSI                      |
// | SCK         | GPIO 18   | SPI Clock                     |
// | SDA / SS    | GPIO 5    | Chip Select (Slave Select)    |
//
// Compatible Cards / Tags:
// 13.56 MHz ISO/IEC 14443A (MIFARE Classic 1K/4K, Ultralight, NTAG213/215/216).
// NOTE: 125 kHz tags (EM4100 / TK4100) are physically incompatible with RC522.
// ============================================================

#include <SPI.h>
#include <MFRC522.h>

#define RFID_SS_PIN   5
#define RFID_RST_PIN  4
#define RFID_SCK_PIN  18
#define RFID_MOSI_PIN 23
#define RFID_MISO_PIN 19

MFRC522 rfid(RFID_SS_PIN, RFID_RST_PIN);

unsigned long lastHeartbeat = 0;
unsigned long scanCount = 0;

void printHex(byte *buffer, byte bufferSize) {
  for (byte i = 0; i < bufferSize; i++) {
    if (buffer[i] < 0x10) Serial.print("0");
    Serial.print(buffer[i], HEX);
    if (i < bufferSize - 1) Serial.print(" ");
  }
}

void setup() {
  Serial.begin(115200);
  while (!Serial && millis() < 2000); // Wait for Serial Monitor
  delay(500);

  Serial.println();
  Serial.println("==================================================");
  Serial.println("   DIVYADRISHTI MFRC522 ISOLATED DIAGNOSTIC TEST  ");
  Serial.println("==================================================");
  Serial.println();

  Serial.println("[1] Configuring SPI Pins:");
  Serial.printf("    - SCK  : GPIO %d\n", RFID_SCK_PIN);
  Serial.printf("    - MISO : GPIO %d\n", RFID_MISO_PIN);
  Serial.printf("    - MOSI : GPIO %d\n", RFID_MOSI_PIN);
  Serial.printf("    - SS/CS: GPIO %d\n", RFID_SS_PIN);
  Serial.printf("    - RST  : GPIO %d\n", RFID_RST_PIN);
  Serial.println();

  // Configure CS pin as output HIGH before starting SPI
  pinMode(RFID_SS_PIN, OUTPUT);
  digitalWrite(RFID_SS_PIN, HIGH);

  // Perform clean hardware reset on RST pin
  Serial.println("[2] Performing Hardware Reset pulse on RST (GPIO 4)...");
  pinMode(RFID_RST_PIN, OUTPUT);
  digitalWrite(RFID_RST_PIN, LOW);
  delay(10);
  digitalWrite(RFID_RST_PIN, HIGH);
  delay(50); // Allow oscillator startup

  // Initialize SPI bus with software CS (-1 for SS so SPI peripheral doesn't seize pin 5)
  Serial.println("[3] Initializing ESP32 SPI bus...");
  SPI.begin(RFID_SCK_PIN, RFID_MISO_PIN, RFID_MOSI_PIN, -1);

  // Initialize MFRC522
  Serial.println("[4] Initializing MFRC522 (rfid.PCD_Init)...");
  rfid.PCD_Init(RFID_SS_PIN, RFID_RST_PIN);
  delay(10);

  // Read firmware version register
  Serial.println("[5] Checking MFRC522 Firmware Version Register:");
  byte version = rfid.PCD_ReadRegister(MFRC522::PCD_Register::VersionReg);
  Serial.printf("    Register Version: 0x%02X ", version);

  bool spiOk = false;
  switch (version) {
    case 0x88:
      Serial.println("-> FM17522 clone (Functional)");
      spiOk = true;
      break;
    case 0x90:
      Serial.println("-> Version 0.0 (Functional early rev)");
      spiOk = true;
      break;
    case 0x91:
      Serial.println("-> NXP Genuine MFRC522 v1.0 (Functional)");
      spiOk = true;
      break;
    case 0x92:
      Serial.println("-> NXP Genuine MFRC522 v2.0 (Functional)");
      spiOk = true;
      break;
    case 0x12:
      Serial.println("-> Counterfeit/Clone chip (Functional)");
      spiOk = true;
      break;
    case 0x00:
    case 0xFF:
    default:
      Serial.println("-> [ERROR] Communication Failure!");
      Serial.println();
      Serial.println("    ***************************************************");
      Serial.println("    [TROUBLESHOOTING GUIDE]");
      Serial.println("    1. VCC: Verify MFRC522 is connected to 3.3V (NOT 5V).");
      Serial.println("    2. GND: Ensure common GND between ESP32 and MFRC522.");
      Serial.println("    3. WIRING: Check jumper wires on SCK (18), MISO (19),");
      Serial.println("       MOSI (23), SDA (5), RST (4).");
      Serial.println("    4. SOLDER: If header pins are not soldered, press them");
      Serial.println("       firmly against PCB contacts or solder them.");
      Serial.println("    ***************************************************");
      break;
  }

  if (spiOk) {
    // Boost antenna gain to maximum (48dB)
    Serial.println("[6] Setting antenna gain to MAXIMUM (48 dB) for maximum detection range...");
    rfid.PCD_SetAntennaGain(MFRC522::RxGain_max);
    rfid.PCD_AntennaOn();
    Serial.println("    Antenna gain configured.");
    Serial.println();
    Serial.println("-> DIAGNOSTIC READY: Present a 13.56 MHz RFID card or tag to antenna...");
  } else {
    Serial.println();
    Serial.println("-> CONTINUING IN DIAGNOSTIC LOOP (Will monitor for connection recovery)...");
  }
  Serial.println("==================================================");
  Serial.println();
}

void loop() {
  // Periodic 3-second heartbeat to confirm loop is running
  if (millis() - lastHeartbeat >= 3000) {
    lastHeartbeat = millis();
    byte version = rfid.PCD_ReadRegister(MFRC522::PCD_Register::VersionReg);
    Serial.printf("[DIAGNOSTIC STATUS] Polling active (Scans: %lu) | Reader Version: 0x%02X\n",
                  scanCount, version);
  }

  // 1. Check if a card or tag is in the RF field
  if (!rfid.PICC_IsNewCardPresent()) {
    delay(50);
    return;
  }

  // A card was sensed in the RF field
  Serial.println();
  Serial.println(">>> [CARD DETECTED IN RF FIELD] <<<");

  // 2. Attempt to read the card's serial number (UID)
  if (!rfid.PICC_ReadCardSerial()) {
    Serial.println("    [WARNING] Sensed RF modulation, but UID read FAILED!");
    Serial.println("    Causes: Card moved too quickly, weak RF coupling, or tag is 125kHz incompatible.");
    delay(200);
    return;
  }

  // 3. Card UID successfully read
  scanCount++;
  Serial.println("    [SUCCESS] Card UID read successfully!");
  Serial.printf("    - UID Size : %d bytes\n", rfid.uid.size);
  Serial.print("    - UID Bytes: ");
  printHex(rfid.uid.uidByte, rfid.uid.size);
  Serial.println();

  // PICC Type
  MFRC522::PICC_Type piccType = rfid.PICC_GetType(rfid.uid.sak);
  Serial.printf("    - SAK Byte : 0x%02X\n", rfid.uid.sak);
  Serial.printf("    - Card Type: %s\n", rfid.PICC_GetTypeName(piccType));

  // Check known project test cards
  byte authUid[]   = { 0xC9, 0xDA, 0x12, 0x07 };
  byte unauthUid[] = { 0xBD, 0x92, 0x35, 0x07 };

  bool isAuth = (rfid.uid.size == 4);
  bool isUnauth = (rfid.uid.size == 4);
  for (byte i = 0; i < 4 && rfid.uid.size == 4; i++) {
    if (rfid.uid.uidByte[i] != authUid[i]) isAuth = false;
    if (rfid.uid.uidByte[i] != unauthUid[i]) isUnauth = false;
  }

  if (isAuth) {
    Serial.println("    -> MATCHES DivyaDrishti AUTHORIZED Rider Card (0xC9 0xDA 0x12 0x07)");
  } else if (isUnauth) {
    Serial.println("    -> MATCHES DivyaDrishti UNAUTHORIZED Test Card (0xBD 0x92 0x35 0x07)");
  } else {
    Serial.println("    -> NEW/UNREGISTERED Card or Tag (Add this UID to database or AUTH_UID)");
  }

  // Halt card and stop encryption
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();

  Serial.println("--------------------------------------------------");
  delay(800); // Debounce delay
}
