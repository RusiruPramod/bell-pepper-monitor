// Gateway Node with ADR and Duty Cycle Monitoring
// ESP32 + RA-02 LoRa Receiver
// IMPORTANT: LoRa config must match Node 1 (frequency, bandwidth, SF)

#include <SPI.h>
#include <LoRa.h>
#include <WiFi.h>
#include <Firebase_ESP_Client.h>

// Provide the token generation process info.
#include "addons/TokenHelper.h"

// WiFi Credentials
#define WIFI_SSID "ESP32"
#define WIFI_PASSWORD "12345678"

// Firebase config
#define API_KEY "AIzaSyA5cNymJHl2DuKMBZr4CYPcc2-ADzDK6OM"
#define PROJECT_ID "lorawan-16ee0"
// Firestore requires Email/Password authentication by default for ESP32 Client
#define USER_EMAIL "lorawanproject4@gmail.com"
#define USER_PASSWORD "lorawan123"

// Firebase objects
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// LoRa settings (MUST MATCH NODE 1!)
#define LORA_FREQUENCY 433E6          // Must match Node 1
#define LORA_SPREADING_FACTOR 7       // Must match Node 1 (if ADR disabled)
#define LORA_BANDWIDTH 125E3          // Must match Node 1

// Pins
#define LORA_SCK 18
#define LORA_MISO 19
#define LORA_MOSI 23
#define LORA_CS 5
#define LORA_RST 2
#define LORA_DIO0 4

// Thresholds
#define TEMP_HIGH 28.0
#define TEMP_LOW 18.0
#define HUMIDITY_HIGH 70.0
#define HUMIDITY_LOW 30.0
#define RSSI_EXCELLENT -50
#define RSSI_GOOD -70
#define RSSI_WEAK -90

// Stats
int packetsReceived = 0;
int packetsFailed = 0;
int sf7Count = 0, sf9Count = 0, sf10Count = 0, sf12Count = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n[*] IoT Gateway - ADR & Duty Cycle Monitor");

  // Initialize WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("[*] Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(300);
  }
  Serial.println();
  Serial.print("[+] Connected with IP: ");
  Serial.println(WiFi.localIP());

  // Initialize Firebase
  Serial.println("[*] Initializing Firebase...");
  config.api_key = API_KEY;
  auth.user.email = USER_EMAIL;
  auth.user.password = USER_PASSWORD;
  config.token_status_callback = tokenStatusCallback;
  
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  Serial.println("[*] Initializing LoRa receiver...");
  LoRa.setPins(LORA_CS, LORA_RST, LORA_DIO0);
  
  if (!LoRa.begin(LORA_FREQUENCY)) {
    Serial.println("[!] LoRa initialization failed");
    while (1);
  }
  
  LoRa.setSpreadingFactor(LORA_SPREADING_FACTOR);
  LoRa.setSignalBandwidth(LORA_BANDWIDTH);
  LoRa.enableCrc();
  
  Serial.print("[+] LoRa ready: ");
  Serial.print(LORA_FREQUENCY / 1E6);
  Serial.print(" MHz, SF");
  Serial.println(LORA_SPREADING_FACTOR);
  Serial.println("[*] Listening for sensor data...\n");
}

void loop() {
  int packetSize = LoRa.parsePacket();
  
  if (packetSize) {
    receiveAndProcess();
  }
  
  delay(10);
}

void receiveAndProcess() {
  String packet = "";
  packet.reserve(64);
  
  // Read packet with validation
  while (LoRa.available()) {
    char c = (char)LoRa.read();
    if (c >= 32 && c <= 126) {
      packet += c;
    }
  }
  
  // Aggressive buffer clearing
  delay(10);
  while (LoRa.available()) {
    LoRa.read();
  }
  delay(10);
  
  int rssi = LoRa.packetRssi();
  float snr = LoRa.packetSnr();
  
  // Clear serial buffer
  Serial.flush();
  delay(50);
  
  Serial.println("\n[+] Packet Received");
  Serial.print("[-] Data: ");
  Serial.println(packet);
  Serial.print("[-] RSSI: ");
  Serial.print(rssi);
  Serial.print(" dBm | SNR: ");
  Serial.print(snr);
  Serial.println(" dB");
  Serial.flush();
  delay(20);
  
  if (parseAndDisplay(packet, rssi, snr)) {
    packetsReceived++;
  } else {
    packetsFailed++;
  }
  
  Serial.print("\n[-] Stats - RX: ");
  Serial.print(packetsReceived);
  Serial.print(" | Failed: ");
  Serial.println(packetsFailed);
  Serial.flush();
  delay(20);
  
  displayADRStats();
  
  Serial.println();
  Serial.flush();
  
  delay(100);
}

bool parseAndDisplay(String data, int rssi, float snr) {
  // Format: NodeID,Temp,Hum,Boot,TX,SF,Power
  
  int nodeId, bootCount, txCount, sf, txPower;
  float temperature, humidity;
  
  // Parse CSV
  int idx1 = data.indexOf(',');
  int idx2 = data.indexOf(',', idx1 + 1);
  int idx3 = data.indexOf(',', idx2 + 1);
  int idx4 = data.indexOf(',', idx3 + 1);
  int idx5 = data.indexOf(',', idx4 + 1);
  int idx6 = data.indexOf(',', idx5 + 1);
  
  if (idx1 == -1 || idx2 == -1 || idx3 == -1 || idx4 == -1 || idx5 == -1 || idx6 == -1) {
    Serial.println("[!] Parse error: Invalid format");
    return false;
  }
  
  nodeId = data.substring(0, idx1).toInt();
  temperature = data.substring(idx1 + 1, idx2).toFloat();
  humidity = data.substring(idx2 + 1, idx3).toFloat();
  bootCount = data.substring(idx3 + 1, idx4).toInt();
  txCount = data.substring(idx4 + 1, idx5).toInt();
  sf = data.substring(idx5 + 1, idx6).toInt();
  txPower = data.substring(idx6 + 1).toInt();
  
  // Validate
  if (temperature < -40 || temperature > 80 || humidity < 0 || humidity > 100) {
    Serial.println("[!] Values out of range");
    return false;
  }
  
  // Display data
  Serial.println("\n[*] Sensor Data");
  Serial.print("[-] Node: ");
  Serial.println(nodeId);
  Serial.print("[-] Temp: ");
  Serial.print(temperature);
  Serial.println(" C");
  Serial.print("[-] Humidity: ");
  Serial.print(humidity);
  Serial.println(" %");
  Serial.print("[-] Boot: ");
  Serial.print(bootCount);
  Serial.print(" | TX: ");
  Serial.println(txCount);
  Serial.flush();
  delay(20);
  
  displayADRInfo(sf, txPower, rssi, snr);
  Serial.flush();
  delay(20);
  
  updateSFStats(sf);
  analyzeEnergy(temperature, humidity);
  Serial.flush();
  delay(20);
  
  // Send data to Firestore
  if (Firebase.ready()) {
    FirebaseJson content;
    
    content.set("fields/nodeId/integerValue", nodeId);
    content.set("fields/temperature/doubleValue", temperature);
    content.set("fields/humidity/doubleValue", humidity);
    content.set("fields/bootCount/integerValue", bootCount);
    content.set("fields/txCount/integerValue", txCount);
    content.set("fields/sf/integerValue", sf);
    content.set("fields/txPower/integerValue", txPower);
    content.set("fields/rssi/integerValue", rssi);
    content.set("fields/snr/doubleValue", snr);
    
    Serial.print("[*] Sending data to Firestore... ");
    // Empty string for databaseId uses the (default) database
    // "sensor_data" is the collection path. Firestore will auto-generate a document ID.
    if (Firebase.Firestore.createDocument(&fbdo, PROJECT_ID, "", "sensor_data", content.raw())) {
      Serial.println("Success!");
    } else {
      Serial.println("Failed!");
      Serial.println(fbdo.errorReason());
    }
  }

  return true;
}

void displayADRInfo(int sf, int txPower, int rssi, float snr) {
  Serial.println("\n[*] ADR Status");
  Serial.print("[-] Config: SF");
  Serial.print(sf);
  Serial.print(", ");
  Serial.print(txPower);
  Serial.print(" dBm | Quality: ");
  
  if (rssi > RSSI_EXCELLENT) {
    Serial.println("Excellent");
  } else if (rssi > RSSI_GOOD) {
    Serial.println("Good");
  } else if (rssi > RSSI_WEAK) {
    Serial.println("Weak");
  } else {
    Serial.println("Very Weak");
  }
  
  int linkMargin = rssi + 157;
  Serial.print("[-] Link margin: ");
  Serial.print(linkMargin);
  Serial.println(" dB");
  
  Serial.print("[-] Recommend: ");
  if (rssi > RSSI_EXCELLENT) {
    Serial.println("SF7/14dBm (max efficiency)");
  } else if (rssi > RSSI_GOOD) {
    Serial.println("SF9/17dBm (balanced)");
  } else if (rssi > RSSI_WEAK) {
    Serial.println("SF10/20dBm (long range)");
  } else {
    Serial.println("SF12/20dBm (max range)");
  }
  
  // Air time estimate
  float airTime;
  switch(sf) {
    case 7:  airTime = 41; break;
    case 8:  airTime = 72; break;
    case 9:  airTime = 144; break;
    case 10: airTime = 247; break;
    case 11: airTime = 494; break;
    case 12: airTime = 988; break;
    default: airTime = 100; break;
  }
  
  Serial.print("[-] Air time: ");
  Serial.print(airTime);
  Serial.println(" ms");
  
  float dutyCycle = (airTime / 3600000.0) * 100.0;
  Serial.print("[-] Duty impact: ");
  Serial.print(dutyCycle, 4);
  Serial.println(" %");
}

void updateSFStats(int sf) {
  switch(sf) {
    case 7:  sf7Count++; break;
    case 9:  sf9Count++; break;
    case 10: sf10Count++; break;
    case 12: sf12Count++; break;
  }
}

void displayADRStats() {
  Serial.println("[*] ADR Statistics");
  Serial.print("[-] SF7: ");
  Serial.print(sf7Count);
  Serial.print(" | SF9: ");
  Serial.print(sf9Count);
  Serial.print(" | SF10: ");
  Serial.print(sf10Count);
  Serial.print(" | SF12: ");
  Serial.println(sf12Count);
  
  if (packetsReceived > 0) {
    float avgSaving = ((float)(sf7Count * 30 + sf9Count * 15 + sf10Count * 5) / (float)packetsReceived);
    Serial.print("[-] Est. power saving: ");
    Serial.print(avgSaving, 1);
    Serial.println(" %");
  }
}

void analyzeEnergy(float temp, float humidity) {
  Serial.println("\n[*] Energy Analysis");
  
  bool action = false;
  
  if (temp > TEMP_HIGH) {
    Serial.print("[!] Temp HIGH (");
    Serial.print(temp);
    Serial.println(" C) - Enable cooling");
    action = true;
  } else if (temp < TEMP_LOW) {
    Serial.print("[!] Temp LOW (");
    Serial.print(temp);
    Serial.println(" C) - Enable heating");
    action = true;
  } else {
    Serial.print("[+] Temp OK (");
    Serial.print(temp);
    Serial.println(" C)");
  }
  
  if (humidity > HUMIDITY_HIGH) {
    Serial.print("[!] Humidity HIGH (");
    Serial.print(humidity);
    Serial.println(" %) - Dehumidify");
    action = true;
  } else if (humidity < HUMIDITY_LOW) {
    Serial.print("[!] Humidity LOW (");
    Serial.print(humidity);
    Serial.println(" %) - Humidify");
    action = true;
  } else {
    Serial.print("[+] Humidity OK (");
    Serial.print(humidity);
    Serial.println(" %)");
  }
  
  if (!action) {
    Serial.println("[+] All systems OFF - Max energy saving");
  }
}
