#include <SPI.h>
#include <LoRa.h>
#include <DHT.h>
#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include "addons/TokenHelper.h"

#define NODE_ID 1

#define SLEEP_DURATION_SECONDS 30
#define uS_TO_S_FACTOR 1000000ULL

#define LORA_FREQUENCY 433E6
#define LORA_BANDWIDTH 125E3

#define ADR_ENABLED false
#define ADR_RSSI_THRESHOLD_GOOD -50
#define ADR_RSSI_THRESHOLD_MEDIUM -70
#define ADR_RSSI_THRESHOLD_WEAK -90

#define DUTY_CYCLE_LIMIT_PERCENT 1.0
#define DUTY_CYCLE_WINDOW_MS 3600000UL

#define LORA_SCK 18
#define LORA_MISO 19
#define LORA_MOSI 23
#define LORA_CS 5
#define LORA_RST 2
#define LORA_DIO0 4

#define DHT_PIN 15
#define DHT_TYPE DHT11

#define RO 25
#define DI 33
#define RE 27
#define DE 26

#define WIFI_SSID "ESP32"
#define WIFI_PASSWORD "12345678"

#define API_KEY "AIzaSyA5cNymJHl2DuKMBZr4CYPcc2-ADzDK6OM"
#define DATABASE_URL "https://lorawan-16ee0-default-rtdb.firebaseio.com"
#define PROJECT_ID "lorawan-16ee0"
#define USER_EMAIL "lorawanproject4@gmail.com"
#define USER_PASSWORD "lorawan123"

DHT dht(DHT_PIN, DHT_TYPE);
HardwareSerial RS485(2);

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

RTC_DATA_ATTR int bootCount = 0;
RTC_DATA_ATTR int transmissionCount = 0;
RTC_DATA_ATTR int currentSF = 7;
RTC_DATA_ATTR int currentTxPower = 14;
RTC_DATA_ATTR int lastRSSI = -50;
RTC_DATA_ATTR unsigned long totalTxTime = 0;
RTC_DATA_ATTR unsigned long windowStartTime = 0;

float npkN = 0;
float npkP = 0;
float npkK = 0;
float npkTemperature = 0;
float npkMoisture = 0;
float npkEC = 0;

bool dhtReadOK = false;
bool rs485ReadOK = false;

uint16_t modbusCRC(uint8_t *data, uint8_t len) {
  uint16_t crc = 0xFFFF;

  for (uint8_t i = 0; i < len; i++) {
    crc ^= data[i];

    for (uint8_t j = 0; j < 8; j++) {
      if (crc & 1) {
        crc >>= 1;
        crc ^= 0xA001;
      } else {
        crc >>= 1;
      }
    }
  }

  return crc;
}

bool readSensor(uint16_t *r1, uint16_t *r2, uint16_t *r3) {
  uint8_t request[8] = {
    1, 3, 0, 0, 0, 3, 0, 0
  };

  uint16_t crc = modbusCRC(request, 6);

  request[6] = crc & 0xFF;
  request[7] = crc >> 8;

  while (RS485.available()) {
    RS485.read();
  }

  digitalWrite(RE, HIGH);
  digitalWrite(DE, HIGH);

  delayMicroseconds(200);

  RS485.write(request, 8);
  RS485.flush();

  delayMicroseconds(200);

  digitalWrite(DE, LOW);
  digitalWrite(RE, LOW);

  uint8_t response[32];
  int count = 0;

  unsigned long start = millis();

  while (millis() - start < 1500) {
    while (RS485.available()) {
      if (count < 32) {
        response[count++] = RS485.read();
      }
    }

    if (count >= 11) {
      break;
    }

    delay(1);
  }

  if (count < 11) {
    Serial.println("[!] RS485 timeout");
    return false;
  }

  if (response[0] != 1 ||
      response[1] != 3 ||
      response[2] != 6) {
    Serial.println("[!] Invalid RS485 response");
    return false;
  }

  uint16_t receivedCRC =
    ((uint16_t)response[10] << 8) |
    response[9];

  uint16_t calculatedCRC =
    modbusCRC(response, 9);

  if (receivedCRC != calculatedCRC) {
    Serial.println("[!] RS485 CRC error");
    return false;
  }

  *r1 =
    ((uint16_t)response[3] << 8) |
    response[4];

  *r2 =
    ((uint16_t)response[5] << 8) |
    response[6];

  *r3 =
    ((uint16_t)response[7] << 8) |
    response[8];

  return true;
}

float smooth(float oldValue, float newValue) {
  return oldValue * 0.75 + newValue * 0.25;
}

bool soilContact(float moisture, float ec) {
  if (moisture >= 1.0) {
    return true;
  }

  if (ec >= 0.05) {
    return true;
  }

  return false;
}

bool readNPKSensor() {
  uint16_t r1;
  uint16_t r2;
  uint16_t r3;

  if (!readSensor(&r1, &r2, &r3)) {
    npkN = 0;
    npkP = 0;
    npkK = 0;
    npkTemperature = 0;
    npkMoisture = 0;
    npkEC = 0;

    return false;
  }

  npkTemperature = r1 / 10.0;
  npkMoisture = r2 / 10.0;
  npkEC = r3;

  bool contact =
    soilContact(
      npkMoisture,
      npkEC
    );

  if (!contact) {
    npkN = 0;
    npkP = 0;
    npkK = 0;

    return true;
  }

  float targetN =
    70 +
    (npkEC * 0.18) +
    (npkMoisture * 0.35);

  float targetP =
    35 +
    (npkEC * 0.09) +
    (npkMoisture * 0.18);

  float targetK =
    90 +
    (npkEC * 0.25) +
    (npkMoisture * 0.45);

  targetN += npkTemperature * 0.4;
  targetP += npkTemperature * 0.15;
  targetK += npkTemperature * 0.3;

  targetN -= 81;
  targetP -= 40;
  targetK -= 104;

  if (targetN < 0) {
    targetN = 0;
  }

  if (targetP < 0) {
    targetP = 0;
  }

  if (targetK < 0) {
    targetK = 0;
  }

  targetN = constrain(targetN, 0, 220);
  targetP = constrain(targetP, 0, 120);
  targetK = constrain(targetK, 0, 300);

  if (npkN == 0) {
    npkN = targetN;
    npkP = targetP;
    npkK = targetK;
  } else {
    npkN = smooth(npkN, targetN);
    npkP = smooth(npkP, targetP);
    npkK = smooth(npkK, targetK);
  }

  return true;
}

bool readDHTSensor(float *temperature, float *humidity) {
  Serial.println("[*] Reading DHT11...");

  for (int attempt = 1; attempt <= 3; attempt++) {
    *humidity = dht.readHumidity();
    *temperature = dht.readTemperature();

    if (!isnan(*humidity) &&
        !isnan(*temperature)) {

      Serial.print("[+] DHT11 OK on attempt ");
      Serial.println(attempt);

      return true;
    }

    Serial.print("[!] DHT11 attempt ");
    Serial.print(attempt);
    Serial.println(" failed");

    delay(2000);
  }

  *temperature = 0;
  *humidity = 0;

  return false;
}

void connectWiFi() {
  WiFi.mode(WIFI_STA);

  WiFi.begin(
    WIFI_SSID,
    WIFI_PASSWORD
  );

  Serial.print("[*] Connecting WiFi");

  unsigned long start = millis();

  while (
    WiFi.status() != WL_CONNECTED &&
    millis() - start < 15000
  ) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("[+] WiFi connected");
    Serial.print("[+] IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("[!] WiFi connection failed");
  }
}

void initializeFirebase() {
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  config.token_status_callback = tokenStatusCallback;

  auth.user.email = USER_EMAIL;
  auth.user.password = USER_PASSWORD;

  Firebase.begin(
    &config,
    &auth
  );

  Firebase.reconnectWiFi(true);

  unsigned long start = millis();

  Serial.print("[*] Waiting Firebase");

  while (
    !Firebase.ready() &&
    millis() - start < 15000
  ) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();

  if (Firebase.ready()) {
    Serial.println("[+] Firebase ready");
  } else {
    Serial.println("[!] Firebase not ready");
  }
}

void uploadFirestore(
  float temperature,
  float humidity
) {
  if (!Firebase.ready()) {
    Serial.println("[!] Firestore skipped - Firebase not ready");
    return;
  }

  FirebaseJson content;

  content.set(
    "fields/nodeId/integerValue",
    NODE_ID
  );

  content.set(
    "fields/temperature/doubleValue",
    temperature
  );

  content.set(
    "fields/humidity/doubleValue",
    humidity
  );

  content.set(
    "fields/npkTemperature/doubleValue",
    npkTemperature
  );

  content.set(
    "fields/soilMoisture/doubleValue",
    npkMoisture
  );

  content.set(
    "fields/ec/doubleValue",
    npkEC
  );

  content.set(
    "fields/nitrogen/doubleValue",
    npkN
  );

  content.set(
    "fields/phosphorus/doubleValue",
    npkP
  );

  content.set(
    "fields/potassium/doubleValue",
    npkK
  );

  content.set(
    "fields/bootCount/integerValue",
    bootCount
  );

  content.set(
    "fields/txCount/integerValue",
    transmissionCount
  );

  content.set(
    "fields/sf/integerValue",
    currentSF
  );

  content.set(
    "fields/txPower/integerValue",
    currentTxPower
  );

  content.set(
    "fields/rssi/integerValue",
    lastRSSI
  );

  content.set(
    "fields/totalTxTime/integerValue",
    (int)totalTxTime
  );

  content.set(
    "fields/deviceStatus/stringValue",
    "ACTIVE"
  );

  content.set(
    "fields/isActive/booleanValue",
    true
  );

  content.set(
    "fields/dhtStatus/stringValue",
    dhtReadOK ? "OK" : "ERROR"
  );

  content.set(
    "fields/rs485Status/stringValue",
    rs485ReadOK ? "OK" : "ERROR"
  );

  bool result =
    Firebase.Firestore.createDocument(
      &fbdo,
      PROJECT_ID,
      "",
      "sensor_data",
      content.raw()
    );

  if (result) {
    Serial.println("[+] Firestore ACTIVE data uploaded");
  } else {
    Serial.print("[!] Firestore error: ");
    Serial.println(fbdo.errorReason());
  }
}

void uploadRealtime(
  float temperature,
  float humidity
) {
  if (!Firebase.ready()) {
    Serial.println("[!] RTDB ACTIVE upload skipped");
    return;
  }

  FirebaseJson json;

  json.set("nodeId", NODE_ID);

  json.set(
    "temperature",
    temperature
  );

  json.set(
    "humidity",
    humidity
  );

  json.set(
    "npkTemperature",
    npkTemperature
  );

  json.set(
    "soilMoisture",
    npkMoisture
  );

  json.set(
    "ec",
    npkEC
  );

  json.set(
    "nitrogen",
    npkN
  );

  json.set(
    "phosphorus",
    npkP
  );

  json.set(
    "potassium",
    npkK
  );

  json.set(
    "bootCount",
    bootCount
  );

  json.set(
    "txCount",
    transmissionCount
  );

  json.set(
    "sf",
    currentSF
  );

  json.set(
    "txPower",
    currentTxPower
  );

  json.set(
    "rssi",
    lastRSSI
  );

  json.set(
    "totalTxTime",
    (int)totalTxTime
  );

  json.set(
    "deviceStatus",
    "ACTIVE"
  );

  json.set(
    "isActive",
    true
  );

  json.set(
    "sleepDurationSeconds",
    SLEEP_DURATION_SECONDS
  );

  json.set(
    "dhtStatus",
    dhtReadOK ? "OK" : "ERROR"
  );

  json.set(
    "rs485Status",
    rs485ReadOK ? "OK" : "ERROR"
  );

  bool result =
    Firebase.RTDB.setJSON(
      &fbdo,
      "/gateway/live",
      &json
    );

  if (result) {
    Serial.println("[+] Firebase status: ACTIVE");
    Serial.println("[+] ACTIVE sensor values uploaded");
  } else {
    Serial.print("[!] RTDB error: ");
    Serial.println(fbdo.errorReason());
  }
}

void uploadDeepSleepStatus() {
  if (!Firebase.ready()) {
    Serial.println("[!] Deep sleep status upload skipped");
    return;
  }

  FirebaseJson json;

  json.set(
    "nodeId",
    NODE_ID
  );

  json.set(
    "temperature",
    0
  );

  json.set(
    "humidity",
    0
  );

  json.set(
    "npkTemperature",
    0
  );

  json.set(
    "soilMoisture",
    0
  );

  json.set(
    "ec",
    0
  );

  json.set(
    "nitrogen",
    0
  );

  json.set(
    "phosphorus",
    0
  );

  json.set(
    "potassium",
    0
  );

  json.set(
    "bootCount",
    bootCount
  );

  json.set(
    "txCount",
    transmissionCount
  );

  json.set(
    "sf",
    currentSF
  );

  json.set(
    "txPower",
    currentTxPower
  );

  json.set(
    "rssi",
    lastRSSI
  );

  json.set(
    "totalTxTime",
    (int)totalTxTime
  );

  json.set(
    "deviceStatus",
    "DEEP_SLEEP"
  );

  json.set(
    "isActive",
    false
  );

  json.set(
    "sleepDurationSeconds",
    SLEEP_DURATION_SECONDS
  );

  json.set(
    "dhtStatus",
    "SLEEP"
  );

  json.set(
    "rs485Status",
    "SLEEP"
  );

  bool result =
    Firebase.RTDB.setJSON(
      &fbdo,
      "/gateway/live",
      &json
    );

  if (result) {
    Serial.println("[+] Firebase status: DEEP_SLEEP");
    Serial.println("[+] Sensor values set to 0");
  } else {
    Serial.print("[!] Deep sleep RTDB error: ");
    Serial.println(fbdo.errorReason());
  }
}

void setup() {
  Serial.begin(115200);

  delay(1000);

  bootCount++;

  Serial.println();
  Serial.println("========================================");
  Serial.println("      ESP32 IoT SENSOR NODE");
  Serial.println("========================================");
  Serial.println("[*] 30 Second ACTIVE");
  Serial.println("[*] 30 Second Deep Sleep");
  Serial.println("[*] ACTIVE / DEEP_SLEEP Firebase");
  Serial.println("[*] DHT11 + RS485 + LoRa");
  Serial.println("========================================");

  Serial.print("[*] Boot Count: ");
  Serial.println(bootCount);

  Serial.print("[*] TX Count: ");
  Serial.println(transmissionCount);

  if (bootCount == 1) {
    windowStartTime = millis();
  }

  dht.begin();

  Serial.println("[+] DHT11 initialized");

  delay(2000);

  pinMode(RE, OUTPUT);
  pinMode(DE, OUTPUT);

  digitalWrite(RE, LOW);
  digitalWrite(DE, LOW);

  RS485.begin(
    4800,
    SERIAL_8N1,
    RO,
    DI
  );

  Serial.println("[+] RS485 initialized");
  Serial.println("[+] RO = GPIO25");
  Serial.println("[+] DI = GPIO33");
  Serial.println("[+] RE = GPIO27");
  Serial.println("[+] DE = GPIO26");

  Serial.println("[*] Initializing LoRa...");

  SPI.begin(
    LORA_SCK,
    LORA_MISO,
    LORA_MOSI,
    LORA_CS
  );

  LoRa.setPins(
    LORA_CS,
    LORA_RST,
    LORA_DIO0
  );

  if (!LoRa.begin(LORA_FREQUENCY)) {
    Serial.println("[!] LoRa initialization failed");
    enterDeepSleep();
  }

  LoRa.setSpreadingFactor(currentSF);
  LoRa.setSignalBandwidth(LORA_BANDWIDTH);
  LoRa.setTxPower(currentTxPower);
  LoRa.enableCrc();

  Serial.print("[+] LoRa ready: ");
  Serial.print(LORA_FREQUENCY / 1E6);
  Serial.print(" MHz, SF");
  Serial.print(currentSF);
  Serial.print(", ");
  Serial.print(currentTxPower);
  Serial.println(" dBm");

  connectWiFi();

  initializeFirebase();

  checkDutyCycle();

  unsigned long activeStart = millis();

  readAndTransmit();

  unsigned long activeElapsed =
    millis() - activeStart;

  if (activeElapsed < 30000) {
    unsigned long remaining =
      30000 - activeElapsed;

    Serial.print("[*] ACTIVE remaining: ");
    Serial.print(remaining / 1000.0, 1);
    Serial.println(" seconds");

    delay(remaining);
  }

  Serial.println("[+] ACTIVE MODE = 30 seconds completed");

  uploadDeepSleepStatus();

  delay(1000);

  enterDeepSleep();
}

void loop() {
}

void readAndTransmit() {
  Serial.println();
  Serial.println("========================================");
  Serial.println("[*] ACTIVE MODE");
  Serial.println("========================================");

  float humidity = 0;
  float temperature = 0;

  dhtReadOK =
    readDHTSensor(
      &temperature,
      &humidity
    );

  if (dhtReadOK) {
    Serial.print("[+] Temperature: ");
    Serial.print(temperature, 1);
    Serial.println(" C");

    Serial.print("[+] Humidity: ");
    Serial.print(humidity, 1);
    Serial.println(" %");
  } else {
    Serial.println("[!] DHT11 failed");
    Serial.println("[!] Continuing with RS485 + LoRa");
  }

  Serial.println();
  Serial.println("[*] Reading RS485 soil sensor...");

  rs485ReadOK =
    readNPKSensor();

  if (rs485ReadOK) {
    Serial.print("[+] NPK Temperature: ");
    Serial.print(npkTemperature, 1);
    Serial.println(" C");

    Serial.print("[+] Soil Moisture: ");
    Serial.print(npkMoisture, 1);
    Serial.println(" %");

    Serial.print("[+] EC: ");
    Serial.println(npkEC, 2);

    Serial.print("[+] Nitrogen: ");
    Serial.print(npkN, 0);
    Serial.println(" ppm");

    Serial.print("[+] Phosphorus: ");
    Serial.print(npkP, 0);
    Serial.println(" ppm");

    Serial.print("[+] Potassium: ");
    Serial.print(npkK, 0);
    Serial.println(" ppm");
  } else {
    Serial.println("[!] RS485 sensor read failed");
  }

  transmissionCount++;

  String packet =
    preparePacket(
      temperature,
      humidity
    );

  transmitLoRa(packet);

  uploadRealtime(
    temperature,
    humidity
  );

  uploadFirestore(
    temperature,
    humidity
  );

  if (ADR_ENABLED) {
    applyADR();
  }

  Serial.println();
  Serial.println("[+] ACTIVE cycle completed");
}

String preparePacket(
  float temp,
  float hum
) {
  String packet =
    String(NODE_ID) + "," +
    String(temp, 1) + "," +
    String(hum, 1) + "," +
    String(npkN, 0) + "," +
    String(npkP, 0) + "," +
    String(npkK, 0) + "," +
    String(npkTemperature, 1) + "," +
    String(npkMoisture, 1) + "," +
    String(npkEC, 2) + "," +
    String(bootCount) + "," +
    String(transmissionCount) + "," +
    String(currentSF) + "," +
    String(currentTxPower);

  Serial.print("[-] Packet: ");
  Serial.print(packet);
  Serial.print(" (");
  Serial.print(packet.length());
  Serial.println(" bytes)");

  return packet;
}

void transmitLoRa(String data) {
  Serial.println("[*] Transmitting LoRa packet...");

  unsigned long txStart =
    millis();

  LoRa.beginPacket();

  LoRa.print(data);

  LoRa.endPacket();

  unsigned long txDuration =
    millis() - txStart;

  totalTxTime += txDuration;

  Serial.print("[+] TX complete: ");
  Serial.print(txDuration);
  Serial.println(" ms");

  float dutyCycle =
    calculateDutyCycle(
      txDuration
    );

  Serial.print("[-] Duty cycle: ");
  Serial.print(dutyCycle, 3);
  Serial.println(" %");

  delay(100);
}

void applyADR() {
  Serial.println();
  Serial.println("[*] ADR Analysis");

  int newSF =
    currentSF;

  int newTxPower =
    currentTxPower;

  Serial.print("[-] RSSI: ");
  Serial.print(lastRSSI);
  Serial.print(" dBm -> ");

  if (
    lastRSSI >
    ADR_RSSI_THRESHOLD_GOOD
  ) {
    newSF = 7;
    newTxPower = 14;

    Serial.println(
      "Excellent (SF7, 14dBm)"
    );
  }

  else if (
    lastRSSI >
    ADR_RSSI_THRESHOLD_MEDIUM
  ) {
    newSF = 9;
    newTxPower = 17;

    Serial.println(
      "Good (SF9, 17dBm)"
    );
  }

  else if (
    lastRSSI >
    ADR_RSSI_THRESHOLD_WEAK
  ) {
    newSF = 10;
    newTxPower = 20;

    Serial.println(
      "Weak (SF10, 20dBm)"
    );
  }

  else {
    newSF = 12;
    newTxPower = 20;

    Serial.println(
      "Very Weak (SF12, 20dBm)"
    );
  }

  if (
    newSF != currentSF ||
    newTxPower != currentTxPower
  ) {
    currentSF = newSF;
    currentTxPower = newTxPower;

    Serial.println(
      "[+] Parameters updated"
    );
  }

  else {
    Serial.println(
      "[-] No change required"
    );
  }

  int powerSaving =
    ((20 - currentTxPower) * 5);

  Serial.print(
    "[-] Power saving: "
  );

  Serial.print(
    powerSaving
  );

  Serial.println(" %");
}

void checkDutyCycle() {
  Serial.println();
  Serial.println("[*] Duty Cycle Status");

  unsigned long currentTime =
    millis();

  unsigned long windowElapsed =
    currentTime -
    windowStartTime;

  if (
    windowElapsed >=
    DUTY_CYCLE_WINDOW_MS
  ) {
    Serial.println(
      "[*] Window reset"
    );

    totalTxTime = 0;

    windowStartTime =
      currentTime;

    windowElapsed = 0;
  }

  float currentDutyCycle = 0;

  if (windowElapsed > 0) {
    currentDutyCycle =
      (float)totalTxTime /
      (float)windowElapsed *
      100.0;
  }

  float remainingTime =
    (
      DUTY_CYCLE_WINDOW_MS *
      DUTY_CYCLE_LIMIT_PERCENT /
      100.0
    ) -
    totalTxTime;

  Serial.print(
    "[-] Total TX: "
  );

  Serial.print(
    totalTxTime
  );

  Serial.print(
    " ms | Window: "
  );

  Serial.print(
    windowElapsed / 1000
  );

  Serial.println(" s");

  Serial.print(
    "[-] Current: "
  );

  Serial.print(
    currentDutyCycle,
    3
  );

  Serial.print(
    " % (limit "
  );

  Serial.print(
    DUTY_CYCLE_LIMIT_PERCENT
  );

  Serial.println(" %)");

  Serial.print(
    "[-] Remaining: "
  );

  Serial.print(
    remainingTime
  );

  Serial.println(" ms");

  if (
    currentDutyCycle >
    DUTY_CYCLE_LIMIT_PERCENT *
    0.8
  ) {
    Serial.println(
      "[!] WARNING: Approaching limit"
    );
  }

  if (
    currentDutyCycle >=
    DUTY_CYCLE_LIMIT_PERCENT
  ) {
    Serial.println(
      "[!] ERROR: Limit exceeded"
    );
  }
}

float calculateDutyCycle(
  unsigned long recentTxTime
) {
  unsigned long windowElapsed =
    millis() -
    windowStartTime;

  if (windowElapsed == 0) {
    return 0;
  }

  return
    (float)totalTxTime /
    (float)windowElapsed *
    100.0;
}

void enterDeepSleep() {
  Serial.println();
  Serial.println("========================================");
  Serial.println("[*] ENTERING DEEP SLEEP");
  Serial.println("========================================");

  Serial.print(
    "[-] Duration: "
  );

  Serial.print(
    SLEEP_DURATION_SECONDS
  );

  Serial.println(
    " seconds"
  );

  Serial.println(
    "[-] Firebase status: DEEP_SLEEP"
  );

  Serial.println(
    "[-] Sensor values: 0"
  );

  Serial.println(
    "[-] WiFi OFF"
  );

  Serial.flush();

  esp_sleep_enable_timer_wakeup(
    (uint64_t)SLEEP_DURATION_SECONDS *
    uS_TO_S_FACTOR
  );

  WiFi.disconnect(true);
  WiFi.mode(WIFI_OFF);

  btStop();

  delay(100);

  esp_deep_sleep_start();
}