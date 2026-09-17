
// ============================================================
// ESP32 + RA-02 LoRa Gateway
// ADR + Duty Cycle Monitoring + Firebase Firestore
//
// SERIAL MONITOR:
//   Baud rate = 115200
//
// LORA:
//   Frequency = 433 MHz
//   Spreading Factor = SF7
//   Bandwidth = 125 kHz
//
// IMPORTANT:
// Node and Gateway LoRa settings must match.
// ============================================================

#include <SPI.h>
#include <LoRa.h>
#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include "addons/TokenHelper.h"

// ============================================================
// SERIAL
// ============================================================

#define SERIAL_BAUD 115200

// ============================================================
// WIFI
// Replace these with your own credentials.
// Do NOT post your real password publicly.
// ============================================================

// WiFi Credentials
#define WIFI_SSID "ESP32"
#define WIFI_PASSWORD "12345678"

// Firebase config
#define API_KEY "AIzaSyA5cNymJHl2DuKMBZr4CYPcc2-ADzDK6OM"
#define PROJECT_ID "lorawan-16ee0"
// Firestore requires Email/Password authentication by default for ESP32 Client
#define USER_EMAIL "lorawanproject4@gmail.com"
#define USER_PASSWORD "lorawan123"

// ============================================================
// FIREBASE OBJECTS
// ============================================================

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// ============================================================
// LORA SETTINGS
// MUST MATCH THE TRANSMITTER
// ============================================================

#define LORA_FREQUENCY        433E6
#define LORA_SPREADING_FACTOR 7
#define LORA_BANDWIDTH        125E3

// ============================================================
// LORA PINS - ESP32 + RA-02
// ============================================================

#define LORA_SCK  18
#define LORA_MISO 19
#define LORA_MOSI 23
#define LORA_CS   5
#define LORA_RST  2
#define LORA_DIO0 4

// ============================================================
// SENSOR THRESHOLDS
// ============================================================

#define TEMP_HIGH      28.0
#define TEMP_LOW       18.0

#define HUMIDITY_HIGH  70.0
#define HUMIDITY_LOW   30.0

// ============================================================
// RSSI THRESHOLDS
// ============================================================

#define RSSI_EXCELLENT -50
#define RSSI_GOOD      -70
#define RSSI_WEAK      -90

// ============================================================
// STATISTICS
// ============================================================

unsigned long packetsReceived = 0;
unsigned long packetsFailed   = 0;

unsigned long sf7Count  = 0;
unsigned long sf8Count  = 0;
unsigned long sf9Count  = 0;
unsigned long sf10Count = 0;
unsigned long sf11Count = 0;
unsigned long sf12Count = 0;

// ============================================================
// FUNCTION DECLARATIONS
// ============================================================

void connectWiFi();
void initializeFirebase();
void initializeLoRa();

void receiveAndProcess();

bool parseAndDisplay(
  String data,
  int rssi,
  float snr
);

void displayADRInfo(
  int sf,
  int txPower,
  int rssi,
  float snr
);

void updateSFStats(int sf);

void displayADRStats();

void analyzeEnergy(
  float temperature,
  float humidity
);

// ============================================================
// SETUP
// ============================================================

void setup()
{
  // ----------------------------------------------------------
  // SERIAL
  // ----------------------------------------------------------

  Serial.begin(SERIAL_BAUD);

  delay(1000);

  Serial.println();
  Serial.println("================================================");
  Serial.println("       ESP32 LoRa IoT GATEWAY");
  Serial.println("================================================");
  Serial.println();

  Serial.print("[*] Serial Baud: ");
  Serial.println(SERIAL_BAUD);

  // ----------------------------------------------------------
  // WIFI
  // ----------------------------------------------------------

  connectWiFi();

  // ----------------------------------------------------------
  // FIREBASE
  // ----------------------------------------------------------

  initializeFirebase();

  // ----------------------------------------------------------
  // LORA
  // ----------------------------------------------------------

  initializeLoRa();

  Serial.println();
  Serial.println("================================================");
  Serial.println("[+] SYSTEM READY");
  Serial.println("[*] Waiting for LoRa packets...");
  Serial.println("================================================");
  Serial.println();
}

// ============================================================
// LOOP
// ============================================================

void loop()
{
  int packetSize = LoRa.parsePacket();

  if (packetSize > 0)
  {
    receiveAndProcess();
  }

  // Small delay only
  delay(5);
}

// ============================================================
// WIFI CONNECTION
// ============================================================

void connectWiFi()
{
  Serial.println("[*] Connecting to WiFi...");

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startTime = millis();

  while (WiFi.status() != WL_CONNECTED)
  {
    delay(500);

    Serial.print(".");

    // Prevent infinite connection loop
    if (millis() - startTime > 30000)
    {
      Serial.println();
      Serial.println("[!] WiFi connection timeout.");
      Serial.println("[!] Check SSID and password.");
      Serial.println();

      return;
    }
  }

  Serial.println();
  Serial.println("[+] WiFi connected.");

  Serial.print("[+] IP Address: ");
  Serial.println(WiFi.localIP());

  Serial.print("[+] RSSI: ");
  Serial.print(WiFi.RSSI());
  Serial.println(" dBm");

  Serial.println();
}

// ============================================================
// FIREBASE INITIALIZATION
// ============================================================

void initializeFirebase()
{
  Serial.println("[*] Initializing Firebase...");

  config.api_key = API_KEY;

  auth.user.email = USER_EMAIL;
  auth.user.password = USER_PASSWORD;

  config.token_status_callback = tokenStatusCallback;

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  Serial.println("[+] Firebase initialized.");
  Serial.println();
}

// ============================================================
// LORA INITIALIZATION
// ============================================================

void initializeLoRa()
{
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

  if (!LoRa.begin(LORA_FREQUENCY))
  {
    Serial.println("[ERROR] LoRa initialization FAILED!");

    while (true)
    {
      delay(1000);
    }
  }

  // ----------------------------------------------------------
  // LoRa configuration
  // ----------------------------------------------------------

  LoRa.setSpreadingFactor(LORA_SPREADING_FACTOR);

  LoRa.setSignalBandwidth(LORA_BANDWIDTH);

  LoRa.enableCrc();

  // Explicit sync word.
  // IMPORTANT: transmitter must use the same value.
  LoRa.setSyncWord(0x12);

  // ----------------------------------------------------------
  // Display configuration
  // ----------------------------------------------------------

  Serial.println("[+] LoRa initialized.");

  Serial.print("[-] Frequency: ");
  Serial.print(LORA_FREQUENCY / 1000000.0);
  Serial.println(" MHz");

  Serial.print("[-] Spreading Factor: SF");
  Serial.println(LORA_SPREADING_FACTOR);

  Serial.print("[-] Bandwidth: ");
  Serial.print(LORA_BANDWIDTH / 1000.0);
  Serial.println(" kHz");

  Serial.println("[-] CRC: Enabled");
  Serial.println("[-] Sync Word: 0x12");

  Serial.println();
}

// ============================================================
// RECEIVE PACKET
// ============================================================

void receiveAndProcess()
{
  String packet = "";

  packet.reserve(128);

  // ----------------------------------------------------------
  // Read entire LoRa packet
  // ----------------------------------------------------------

  while (LoRa.available())
  {
    char c = (char)LoRa.read();

    // Accept normal printable ASCII
    if (c >= 32 && c <= 126)
    {
      packet += c;
    }
  }

  // ----------------------------------------------------------
  // Read radio information BEFORE doing other operations
  // ----------------------------------------------------------

  int rssi = LoRa.packetRssi();

  float snr = LoRa.packetSnr();

  // ----------------------------------------------------------
  // Remove unwanted whitespace
  // ----------------------------------------------------------

  packet.trim();

  Serial.println();
  Serial.println("------------------------------------------------");
  Serial.println("[+] LoRa Packet Received");
  Serial.println("------------------------------------------------");

  Serial.print("[-] Raw Data: ");
  Serial.println(packet);

  Serial.print("[-] Packet Size: ");
  Serial.print(packet.length());
  Serial.println(" bytes");

  Serial.print("[-] RSSI: ");
  Serial.print(rssi);
  Serial.println(" dBm");

  Serial.print("[-] SNR: ");
  Serial.print(snr, 2);
  Serial.println(" dB");

  // ----------------------------------------------------------
  // Validate packet
  // ----------------------------------------------------------

  if (packet.length() == 0)
  {
    Serial.println("[!] Empty packet.");
    packetsFailed++;
    return;
  }

  // ----------------------------------------------------------
  // Parse
  // ----------------------------------------------------------

  if (parseAndDisplay(packet, rssi, snr))
  {
    packetsReceived++;
  }
  else
  {
    packetsFailed++;
  }

  // ----------------------------------------------------------
  // Statistics
  // ----------------------------------------------------------

  displayADRStats();

  Serial.println("------------------------------------------------");
  Serial.println();
}

// ============================================================
// PARSE SENSOR DATA
//
// Expected format:
//
// NodeID,Temp,Hum,Boot,TX,SF,Power
//
// Example:
//
// 1,25.4,61.2,3,25,7,14
// ============================================================

bool parseAndDisplay(
  String data,
  int rssi,
  float snr
)
{
  int nodeId;
  int bootCount;
  int txCount;
  int sf;
  int txPower;

  float temperature;
  float humidity;

  // ----------------------------------------------------------
  // Find CSV commas
  // ----------------------------------------------------------

  int idx1 = data.indexOf(',');
  int idx2 = data.indexOf(',', idx1 + 1);
  int idx3 = data.indexOf(',', idx2 + 1);
  int idx4 = data.indexOf(',', idx3 + 1);
  int idx5 = data.indexOf(',', idx4 + 1);
  int idx6 = data.indexOf(',', idx5 + 1);

  if (
    idx1 < 0 ||
    idx2 < 0 ||
    idx3 < 0 ||
    idx4 < 0 ||
    idx5 < 0 ||
    idx6 < 0
  )
  {
    Serial.println("[!] Parse Error!");
    Serial.println("[!] Expected:");
    Serial.println("    NodeID,Temp,Hum,Boot,TX,SF,Power");

    return false;
  }

  // ----------------------------------------------------------
  // Convert values
  // ----------------------------------------------------------

  nodeId = data.substring(
    0,
    idx1
  ).toInt();

  temperature = data.substring(
    idx1 + 1,
    idx2
  ).toFloat();

  humidity = data.substring(
    idx2 + 1,
    idx3
  ).toFloat();

  bootCount = data.substring(
    idx3 + 1,
    idx4
  ).toInt();

  txCount = data.substring(
    idx4 + 1,
    idx5
  ).toInt();

  sf = data.substring(
    idx5 + 1,
    idx6
  ).toInt();

  txPower = data.substring(
    idx6 + 1
  ).toInt();

  // ----------------------------------------------------------
  // Validate temperature
  // ----------------------------------------------------------

  if (
    temperature < -40.0 ||
    temperature > 80.0
  )
  {
    Serial.print("[!] Invalid temperature: ");
    Serial.println(temperature);

    return false;
  }

  // ----------------------------------------------------------
  // Validate humidity
  // ----------------------------------------------------------

  if (
    humidity < 0.0 ||
    humidity > 100.0
  )
  {
    Serial.print("[!] Invalid humidity: ");
    Serial.println(humidity);

    return false;
  }

  // ----------------------------------------------------------
  // Validate SF
  // ----------------------------------------------------------

  if (
    sf < 7 ||
    sf > 12
  )
  {
    Serial.print("[!] Invalid spreading factor: SF");
    Serial.println(sf);

    return false;
  }

  // ----------------------------------------------------------
  // Display sensor data
  // ----------------------------------------------------------

  Serial.println();
  Serial.println("[*] SENSOR DATA");

  Serial.print("[-] Node ID   : ");
  Serial.println(nodeId);

  Serial.print("[-] Temperature: ");
  Serial.print(temperature, 2);
  Serial.println(" C");

  Serial.print("[-] Humidity  : ");
  Serial.print(humidity, 2);
  Serial.println(" %");

  Serial.print("[-] Boot Count: ");
  Serial.println(bootCount);

  Serial.print("[-] TX Count  : ");
  Serial.println(txCount);

  Serial.print("[-] SF         : SF");
  Serial.println(sf);

  Serial.print("[-] TX Power   : ");
  Serial.print(txPower);
  Serial.println(" dBm");

  // ----------------------------------------------------------
  // ADR
  // ----------------------------------------------------------

  displayADRInfo(
    sf,
    txPower,
    rssi,
    snr
  );

  // ----------------------------------------------------------
  // Statistics
  // ----------------------------------------------------------

  updateSFStats(sf);

  // ----------------------------------------------------------
  // Energy analysis
  // ----------------------------------------------------------

  analyzeEnergy(
    temperature,
    humidity
  );

  // ----------------------------------------------------------
  // Firebase
  // ----------------------------------------------------------

  if (Firebase.ready())
  {
    FirebaseJson content;

    content.set(
      "fields/nodeId/integerValue",
      nodeId
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
      "fields/bootCount/integerValue",
      bootCount
    );

    content.set(
      "fields/txCount/integerValue",
      txCount
    );

    content.set(
      "fields/sf/integerValue",
      sf
    );

    content.set(
      "fields/txPower/integerValue",
      txPower
    );

    content.set(
      "fields/rssi/integerValue",
      rssi
    );

    content.set(
      "fields/snr/doubleValue",
      snr
    );

    Serial.print("[*] Firebase: ");

    if (
      Firebase.Firestore.createDocument(
        &fbdo,
        PROJECT_ID,
        "",
        "sensor_data",
        content.raw()
      )
    )
    {
      Serial.println("SUCCESS");
    }
    else
    {
      Serial.println("FAILED");

      Serial.print("[!] Firebase Error: ");
      Serial.println(fbdo.errorReason());
    }
  }
  else
  {
    Serial.println("[!] Firebase not ready.");
  }

  return true;
}

// ============================================================
// ADR INFORMATION
// ============================================================

void displayADRInfo(
  int sf,
  int txPower,
  int rssi,
  float snr
)
{
  Serial.println();
  Serial.println("[*] ADR STATUS");

  Serial.print("[-] Current SF : SF");
  Serial.println(sf);

  Serial.print("[-] TX Power   : ");
  Serial.print(txPower);
  Serial.println(" dBm");

  Serial.print("[-] RSSI       : ");
  Serial.print(rssi);
  Serial.println(" dBm");

  Serial.print("[-] SNR        : ");
  Serial.print(snr, 2);
  Serial.println(" dB");

  // ----------------------------------------------------------
  // Signal quality
  // ----------------------------------------------------------

  Serial.print("[-] Signal     : ");

  if (rssi > RSSI_EXCELLENT)
  {
    Serial.println("Excellent");
  }
  else if (rssi > RSSI_GOOD)
  {
    Serial.println("Good");
  }
  else if (rssi > RSSI_WEAK)
  {
    Serial.println("Weak");
  }
  else
  {
    Serial.println("Very Weak");
  }

  // ----------------------------------------------------------
  // Link margin
  // ----------------------------------------------------------

  int linkMargin = rssi + 157;

  Serial.print("[-] Link Margin: ");
  Serial.print(linkMargin);
  Serial.println(" dB");

  // ----------------------------------------------------------
  // Suggested configuration
  // ----------------------------------------------------------

  Serial.print("[-] Suggested  : ");

  if (rssi > RSSI_EXCELLENT)
  {
    Serial.println("SF7 / 14 dBm");
  }
  else if (rssi > RSSI_GOOD)
  {
    Serial.println("SF9 / 17 dBm");
  }
  else if (rssi > RSSI_WEAK)
  {
    Serial.println("SF10 / 20 dBm");
  }
  else
  {
    Serial.println("SF12 / 20 dBm");
  }

  // ----------------------------------------------------------
  // Approximate air time
  // ----------------------------------------------------------

  float airTime;

  switch (sf)
  {
    case 7:
      airTime = 41;
      break;

    case 8:
      airTime = 72;
      break;

    case 9:
      airTime = 144;
      break;

    case 10:
      airTime = 247;
      break;

    case 11:
      airTime = 494;
      break;

    case 12:
      airTime = 988;
      break;

    default:
      airTime = 100;
      break;
  }

  Serial.print("[-] Air Time   : ");
  Serial.print(airTime);
  Serial.println(" ms");

  // ----------------------------------------------------------
  // Duty cycle impact
  // ----------------------------------------------------------

  float dutyCycle =
    (airTime / 3600000.0) * 100.0;

  Serial.print("[-] Duty Impact: ");
  Serial.print(dutyCycle, 4);
  Serial.println(" %");
}

// ============================================================
// SF STATISTICS
// ============================================================

void updateSFStats(int sf)
{
  switch (sf)
  {
    case 7:
      sf7Count++;
      break;

    case 8:
      sf8Count++;
      break;

    case 9:
      sf9Count++;
      break;

    case 10:
      sf10Count++;
      break;

    case 11:
      sf11Count++;
      break;

    case 12:
      sf12Count++;
      break;

    default:
      break;
  }
}

// ============================================================
// ADR STATISTICS
// ============================================================

void displayADRStats()
{
  Serial.println();
  Serial.println("[*] ADR STATISTICS");

  Serial.print("[-] RX Packets : ");
  Serial.println(packetsReceived);

  Serial.print("[-] Failed     : ");
  Serial.println(packetsFailed);

  Serial.print("[-] SF7        : ");
  Serial.println(sf7Count);

  Serial.print("[-] SF8        : ");
  Serial.println(sf8Count);

  Serial.print("[-] SF9        : ");
  Serial.println(sf9Count);

  Serial.print("[-] SF10       : ");
  Serial.println(sf10Count);

  Serial.print("[-] SF11       : ");
  Serial.println(sf11Count);

  Serial.print("[-] SF12       : ");
  Serial.println(sf12Count);

  // ----------------------------------------------------------
  // Estimated power saving
  // ----------------------------------------------------------

  if (packetsReceived > 0)
  {
    float avgSaving =
      (
        sf7Count  * 30.0 +
        sf8Count  * 25.0 +
        sf9Count  * 15.0 +
        sf10Count * 5.0
      ) / packetsReceived;

    Serial.print("[-] Est. Saving: ");
    Serial.print(avgSaving, 1);
    Serial.println(" %");
  }
}

// ============================================================
// ENERGY ANALYSIS
// ============================================================

void analyzeEnergy(
  float temp,
  float humidity
)
{
  Serial.println();
  Serial.println("[*] ENERGY ANALYSIS");

  bool action = false;

  // ----------------------------------------------------------
  // Temperature
  // ----------------------------------------------------------

  if (temp > TEMP_HIGH)
  {
    Serial.print("[!] Temperature HIGH: ");
    Serial.print(temp, 2);
    Serial.println(" C");

    Serial.println("    -> Cooling required");

    action = true;
  }
  else if (temp < TEMP_LOW)
  {
    Serial.print("[!] Temperature LOW: ");
    Serial.print(temp, 2);
    Serial.println(" C");

    Serial.println("    -> Heating required");

    action = true;
  }
  else
  {
    Serial.print("[+] Temperature OK: ");
    Serial.print(temp, 2);
    Serial.println(" C");
  }

  // ----------------------------------------------------------
  // Humidity
  // ----------------------------------------------------------

  if (humidity > HUMIDITY_HIGH)
  {
    Serial.print("[!] Humidity HIGH: ");
    Serial.print(humidity, 2);
    Serial.println(" %");

    Serial.println("    -> Dehumidification required");

    action = true;
  }
  else if (humidity < HUMIDITY_LOW)
  {
    Serial.print("[!] Humidity LOW: ");
    Serial.print(humidity, 2);
    Serial.println(" %");

    Serial.println("    -> Humidification required");

    action = true;
  }
  else
  {
    Serial.print("[+] Humidity OK: ");
    Serial.print(humidity, 2);
    Serial.println(" %");
  }

  // ----------------------------------------------------------
  // Final state
  // ----------------------------------------------------------

  if (!action)
  {
    Serial.println("[+] All systems normal.");
    Serial.println("[+] Maximum energy saving mode.");
  }
}

