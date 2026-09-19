#include <SPI.h>
#include <LoRa.h>
#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"
#include <time.h>
#define SERIAL_BAUD 115200
#define WIFI_SSID "ESP32"
#define WIFI_PASSWORD "12345678"
#define API_KEY      "AIzaSyA5cNymJHl2DuKMBZr4CYPcc2-ADzDK6OM"
#define PROJECT_ID   "lorawan-16ee0"
#define DATABASE_URL "https://lorawan-16ee0-default-rtdb.firebaseio.com"
#define USER_EMAIL    "lorawanproject4@gmail.com"
#define USER_PASSWORD "lorawan123"
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;
#define LORA_FREQUENCY        433E6
#define LORA_SPREADING_FACTOR 7
#define LORA_BANDWIDTH        125E3
#define LORA_SCK  18
#define LORA_MISO 19
#define LORA_MOSI 23
#define LORA_CS   5
#define LORA_RST  2
#define LORA_DIO0 4
#define TEMP_HIGH     28.0
#define TEMP_LOW      18.0
#define HUMIDITY_HIGH 70.0
#define HUMIDITY_LOW  30.0
#define RSSI_EXCELLENT -50
#define RSSI_GOOD      -70
#define RSSI_WEAK      -90
unsigned long packetsReceived = 0;
unsigned long packetsSent     = 0;
unsigned long packetsFailed   = 0;
unsigned long sf7Count  = 0;
unsigned long sf8Count  = 0;
unsigned long sf9Count  = 0;
unsigned long sf10Count = 0;
unsigned long sf11Count = 0;
unsigned long sf12Count = 0;
String getISOTimestamp() {
  time_t now;
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    return String(millis());
  }
  char buf[30];
  strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
  return String(buf);
}
void connectWiFi();
void initializeFirebase();
void initializeLoRa();
void receiveAndProcess();
bool parseAndDisplay(String data, int rssi, float snr);
void displayADRInfo(int sf, int txPower, int rssi, float snr);
void updateSFStats(int sf);
void displayADRStats();
void analyzeEnergy(float temperature, float humidity);
void setup() {
  Serial.begin(SERIAL_BAUD);
  delay(1000);
  Serial.println();
  Serial.println("================================================");
  Serial.println("       ESP32 LoRa IoT GATEWAY");
  Serial.println("================================================");
  Serial.println();
  Serial.print("[*] Serial Baud: ");
  Serial.println(SERIAL_BAUD);
  connectWiFi();
  initializeFirebase();
  initializeLoRa();
  Serial.println();
  Serial.println("================================================");
  Serial.println("[+] SYSTEM READY");
  Serial.println("[*] Waiting for LoRa packets...");
  Serial.println("================================================");
  Serial.println();
}
void loop() {
  int packetSize = LoRa.parsePacket();
  if (packetSize > 0) {
    receiveAndProcess();
  }
  delay(5);
}
void connectWiFi() {
  Serial.println("[*] Connecting to WiFi...");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  unsigned long startTime = millis();
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    if (millis() - startTime > 30000) {
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
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  Serial.print("[*] Syncing NTP time");
  struct tm timeinfo;
  for (int i = 0; i < 10; i++) {
    if (getLocalTime(&timeinfo)) {
      Serial.println(" OK");
      break;
    }
    Serial.print(".");
    delay(500);
  }
  Serial.println();
}
void initializeFirebase() {
  Serial.println("[*] Initializing Firebase...");
  config.api_key      = API_KEY;
  config.database_url = DATABASE_URL;
  auth.user.email     = USER_EMAIL;
  auth.user.password  = USER_PASSWORD;
  config.token_status_callback = tokenStatusCallback;
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  Serial.println("[+] Firebase initialized.");
  Serial.println();
}
void initializeLoRa() {
  Serial.println("[*] Initializing LoRa...");
  SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_CS);
  LoRa.setPins(LORA_CS, LORA_RST, LORA_DIO0);
  if (!LoRa.begin(LORA_FREQUENCY)) {
    Serial.println("[ERROR] LoRa initialization FAILED!");
    while (true) { delay(1000); }
  }
  LoRa.setSpreadingFactor(LORA_SPREADING_FACTOR);
  LoRa.setSignalBandwidth(LORA_BANDWIDTH);
  LoRa.enableCrc();
  LoRa.setSyncWord(0x12);
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
void receiveAndProcess() {
  String packet = "";
  packet.reserve(128);
  while (LoRa.available()) {
    char c = (char)LoRa.read();
    if (c >= 32 && c <= 126) {
      packet += c;
    }
  }
  int rssi = LoRa.packetRssi();
  float snr = LoRa.packetSnr();
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
  if (packet.length() == 0) {
    Serial.println("[!] Empty packet.");
    packetsFailed++;
    return;
  }
  if (parseAndDisplay(packet, rssi, snr)) {
    packetsReceived++;
  } else {
    packetsFailed++;
  }
  displayADRStats();
  Serial.println("------------------------------------------------");
  Serial.println();
}
bool parseAndDisplay(String data, int rssi, float snr) {
  int nodeId;
  int bootCount;
  int txCount;
  int sf;
  int txPower;
  float temperature;
  float humidity;
  float npkTemperature;
  float soilMoisture;
  float ec;
  int idx1  = data.indexOf(',');
  int idx2  = data.indexOf(',', idx1  + 1);
  int idx3  = data.indexOf(',', idx2  + 1);
  int idx4  = data.indexOf(',', idx3  + 1);
  int idx5  = data.indexOf(',', idx4  + 1);
  int idx6  = data.indexOf(',', idx5  + 1);
  int idx7  = data.indexOf(',', idx6  + 1);
  int idx8  = data.indexOf(',', idx7  + 1);
  int idx9  = data.indexOf(',', idx8  + 1);
  int idx10 = data.indexOf(',', idx9  + 1);
  int idx11 = data.indexOf(',', idx10 + 1);
  int idx12 = data.indexOf(',', idx11 + 1);
  if (idx1 < 0 || idx2 < 0 || idx3 < 0 || idx4 < 0 || idx5 < 0 || idx6 < 0 ||
      idx7 < 0 || idx8 < 0 || idx9 < 0 || idx10 < 0 || idx11 < 0 || idx12 < 0) {
    Serial.println("[!] Parse Error!");
    Serial.println("[!] Expected: NodeID,Temp,Hum,N,P,K,NpkTemp,SoilMoisture,EC,Boot,TX,SF,Power");
    return false;
  }
  nodeId         = data.substring(0,        idx1).toInt();
  temperature    = data.substring(idx1 + 1, idx2).toFloat();
  humidity       = data.substring(idx2 + 1, idx3).toFloat();
  int nValue     = data.substring(idx3 + 1, idx4).toInt();
  int pValue     = data.substring(idx4 + 1, idx5).toInt();
  int kValue     = data.substring(idx5 + 1, idx6).toInt();
  npkTemperature = data.substring(idx6 + 1, idx7).toFloat();
  soilMoisture   = data.substring(idx7 + 1, idx8).toFloat();
  ec             = data.substring(idx8 + 1, idx9).toFloat();
  bootCount      = data.substring(idx9  + 1, idx10).toInt();
  txCount        = data.substring(idx10 + 1, idx11).toInt();
  sf             = data.substring(idx11 + 1, idx12).toInt();
  txPower        = data.substring(idx12 + 1).toInt();
  if (temperature < -40.0 || temperature > 80.0) {
    Serial.print("[!] Invalid temperature: ");
    Serial.println(temperature);
    return false;
  }
  if (humidity < 0.0 || humidity > 100.0) {
    Serial.print("[!] Invalid humidity: ");
    Serial.println(humidity);
    return false;
  }
  if (sf < 7 || sf > 12) {
    Serial.print("[!] Invalid spreading factor: SF");
    Serial.println(sf);
    return false;
  }
  Serial.println();
  Serial.println("[*] SENSOR DATA");
  Serial.print("[-] Node ID      : "); Serial.println(nodeId);
  Serial.print("[-] Temperature  : "); Serial.print(temperature, 2); Serial.println(" C");
  Serial.print("[-] Humidity     : "); Serial.print(humidity, 2);    Serial.println(" %");
  Serial.print("[-] Nitrogen     : "); Serial.print(nValue);         Serial.println(" ppm");
  Serial.print("[-] Phosphorus   : "); Serial.print(pValue);         Serial.println(" ppm");
  Serial.print("[-] Potassium    : "); Serial.print(kValue);         Serial.println(" ppm");
  Serial.print("[-] NPK Temp     : "); Serial.print(npkTemperature, 1); Serial.println(" C");
  Serial.print("[-] Soil Moisture: "); Serial.print(soilMoisture, 1);   Serial.println(" %");
  Serial.print("[-] EC           : "); Serial.print(ec, 2);              Serial.println(" uS/cm");
  Serial.print("[-] Boot Count   : "); Serial.println(bootCount);
  Serial.print("[-] TX Count     : "); Serial.println(txCount);
  Serial.print("[-] SF           : SF"); Serial.println(sf);
  Serial.print("[-] TX Power     : "); Serial.print(txPower); Serial.println(" dBm");
  displayADRInfo(sf, txPower, rssi, snr);
  updateSFStats(sf);
  analyzeEnergy(temperature, humidity);
  float airTime = 41.0;
  switch (sf) {
    case 7:  airTime =  41.2; break;
    case 8:  airTime =  72.0; break;
    case 9:  airTime = 144.0; break;
    case 10: airTime = 247.0; break;
    case 11: airTime = 494.0; break;
    case 12: airTime = 988.0; break;
  }
  packetsSent = txCount;
  if (Firebase.ready()) {
    float pdr = 0.0;
    if (packetsSent > 0) {
      pdr = ((float)packetsReceived / (float)packetsSent) * 100.0;
    }
    float packetLoss = 100.0 - pdr;
    unsigned long currentMillis = millis();
    static unsigned long lastReceiveMillis = 0;
    float uplinkInterval = 0.0;
    if (lastReceiveMillis > 0) {
      uplinkInterval = (currentMillis - lastReceiveMillis) / 1000.0;
    }
    lastReceiveMillis = currentMillis;
    String linkReliability = "Low";
    if (pdr > 90.0) linkReliability = "High";
    else if (pdr > 70.0) linkReliability = "Medium";
    String lastSeenStr = getISOTimestamp();
    String gatewayMac = WiFi.macAddress();
    FirebaseJson rtdbJson;
    rtdbJson.set("temperature", temperature);
    rtdbJson.set("humidity", humidity);
    rtdbJson.set("nitrogen", nValue);
    rtdbJson.set("phosphorus", pValue);
    rtdbJson.set("potassium", kValue);
    rtdbJson.set("npkTemperature", npkTemperature);
    rtdbJson.set("soilMoisture", soilMoisture);
    rtdbJson.set("ec", ec);
    rtdbJson.set("packetDeliveryRatio", pdr);
    rtdbJson.set("totalPacketsSent", (int)packetsSent);
    rtdbJson.set("totalPacketsReceived", (int)packetsReceived);
    rtdbJson.set("packetLossRate", packetLoss);
    rtdbJson.set("lastHandshake", lastSeenStr);
    rtdbJson.set("transmissionTime", airTime);
    rtdbJson.set("uplinkInterval", uplinkInterval);
    rtdbJson.set("payloadDataLength", data.length());
    rtdbJson.set("linkReliability", linkReliability);
    rtdbJson.set("queueLatency", 15);
    rtdbJson.set("transmitterNodeId", nodeId);
    rtdbJson.set("receiverGatewayId", gatewayMac);
    rtdbJson.set("loraModule", "SX1278 (RA-02)");
    rtdbJson.set("microcontroller", "ESP32");
    rtdbJson.set("networkProtocol", "LoRa (P2P)");
    rtdbJson.set("hardwareMac", "SENSOR_NODE_DEFAULT");
    rtdbJson.set("firmwareVersion", "v1.1.0");
    rtdbJson.set("powerSource", "USB Power");
    rtdbJson.set("rssi", rssi);
    rtdbJson.set("snr", snr);
    rtdbJson.set("adrLinkQualityControl", "Enabled");
    rtdbJson.set("frequencyBand", "433 MHz");
    rtdbJson.set("spreadingFactor", sf);
    rtdbJson.set("signalBandwidth", "125 kHz");
    rtdbJson.set("txPowerOutput", txPower);
    rtdbJson.set("codingRate", "4/5");
    rtdbJson.set("preambleLength", 8);
    rtdbJson.set("syncWord", "0x12");
    Serial.print("[*] RTDB: ");
    if (Firebase.RTDB.setJSON(&fbdo, "/gateway/live", &rtdbJson)) {
      Serial.println("OK");
    } else {
      Serial.print("FAIL - ");
      Serial.println(fbdo.errorReason());
    }
    FirebaseJson fsDoc;
    fsDoc.set("fields/temperature/doubleValue", temperature);
    fsDoc.set("fields/humidity/doubleValue", humidity);
    fsDoc.set("fields/nitrogen/integerValue", nValue);
    fsDoc.set("fields/phosphorus/integerValue", pValue);
    fsDoc.set("fields/potassium/integerValue", kValue);
    fsDoc.set("fields/npkTemperature/doubleValue", npkTemperature);
    fsDoc.set("fields/soilMoisture/doubleValue", soilMoisture);
    fsDoc.set("fields/ec/doubleValue", ec);
    fsDoc.set("fields/packetDeliveryRatio/doubleValue", pdr);
    fsDoc.set("fields/totalPacketsSent/integerValue", (int)packetsSent);
    fsDoc.set("fields/totalPacketsReceived/integerValue", (int)packetsReceived);
    fsDoc.set("fields/packetLossRate/doubleValue", packetLoss);
    fsDoc.set("fields/lastHandshake/stringValue", lastSeenStr);
    fsDoc.set("fields/transmissionTime/doubleValue", airTime);
    fsDoc.set("fields/uplinkInterval/doubleValue", uplinkInterval);
    fsDoc.set("fields/payloadDataLength/integerValue", data.length());
    fsDoc.set("fields/linkReliability/stringValue", linkReliability);
    fsDoc.set("fields/queueLatency/integerValue", 15);
    fsDoc.set("fields/transmitterNodeId/integerValue", nodeId);
    fsDoc.set("fields/receiverGatewayId/stringValue", gatewayMac);
    fsDoc.set("fields/loraModule/stringValue", "SX1278 (RA-02)");
    fsDoc.set("fields/microcontroller/stringValue", "ESP32");
    fsDoc.set("fields/networkProtocol/stringValue", "LoRa (P2P)");
    fsDoc.set("fields/hardwareMac/stringValue", "SENSOR_NODE_DEFAULT");
    fsDoc.set("fields/firmwareVersion/stringValue", "v1.1.0");
    fsDoc.set("fields/powerSource/stringValue", "Battery/USB");
    fsDoc.set("fields/rssi/integerValue", rssi);
    fsDoc.set("fields/snr/doubleValue", snr);
    fsDoc.set("fields/adrLinkQualityControl/stringValue", "Enabled");
    fsDoc.set("fields/frequencyBand/stringValue", "433 MHz");
    fsDoc.set("fields/spreadingFactor/integerValue", sf);
    fsDoc.set("fields/signalBandwidth/stringValue", "125 kHz");
    fsDoc.set("fields/txPowerOutput/integerValue", txPower);
    fsDoc.set("fields/codingRate/stringValue", "4/5");
    fsDoc.set("fields/preambleLength/integerValue", 8);
    fsDoc.set("fields/syncWord/stringValue", "0x12");
    Serial.print("[*] Firestore: ");
    if (Firebase.Firestore.createDocument(&fbdo, PROJECT_ID, "", "sensor_data", fsDoc.raw())) {
      Serial.println("OK");
    } else {
      Serial.print("FAIL - ");
      Serial.println(fbdo.errorReason());
    }
  } else {
    Serial.println("[!] Firebase not ready - skipping write.");
  }
  return true;
}
void displayADRInfo(int sf, int txPower, int rssi, float snr) {
  Serial.println();
  Serial.println("[*] ADR STATUS");
  Serial.print("[-] Current SF : SF"); Serial.println(sf);
  Serial.print("[-] TX Power   : "); Serial.print(txPower); Serial.println(" dBm");
  Serial.print("[-] RSSI       : "); Serial.print(rssi);    Serial.println(" dBm");
  Serial.print("[-] SNR        : "); Serial.print(snr, 2);  Serial.println(" dB");
  Serial.print("[-] Signal     : ");
  if (rssi > RSSI_EXCELLENT)      Serial.println("Excellent");
  else if (rssi > RSSI_GOOD)      Serial.println("Good");
  else if (rssi > RSSI_WEAK)      Serial.println("Weak");
  else                            Serial.println("Very Weak");
  int linkMargin = rssi + 157;
  Serial.print("[-] Link Margin: "); Serial.print(linkMargin); Serial.println(" dB");
  Serial.print("[-] Suggested  : ");
  if (rssi > RSSI_EXCELLENT)      Serial.println("SF7 / 14 dBm");
  else if (rssi > RSSI_GOOD)      Serial.println("SF9 / 17 dBm");
  else if (rssi > RSSI_WEAK)      Serial.println("SF10 / 20 dBm");
  else                            Serial.println("SF12 / 20 dBm");
  float airTime;
  switch (sf) {
    case 7:  airTime =  41; break;
    case 8:  airTime =  72; break;
    case 9:  airTime = 144; break;
    case 10: airTime = 247; break;
    case 11: airTime = 494; break;
    case 12: airTime = 988; break;
    default: airTime = 100; break;
  }
  Serial.print("[-] Air Time   : "); Serial.print(airTime); Serial.println(" ms");
  float dutyCycle = (airTime / 3600000.0) * 100.0;
  Serial.print("[-] Duty Impact: "); Serial.print(dutyCycle, 4); Serial.println(" %");
}
void updateSFStats(int sf) {
  switch (sf) {
    case 7:  sf7Count++;  break;
    case 8:  sf8Count++;  break;
    case 9:  sf9Count++;  break;
    case 10: sf10Count++; break;
    case 11: sf11Count++; break;
    case 12: sf12Count++; break;
    default: break;
  }
}
void displayADRStats() {
  Serial.println();
  Serial.println("[*] ADR STATISTICS");
  Serial.print("[-] RX Packets : "); Serial.println(packetsReceived);
  Serial.print("[-] Failed     : "); Serial.println(packetsFailed);
  Serial.print("[-] SF7        : "); Serial.println(sf7Count);
  Serial.print("[-] SF8        : "); Serial.println(sf8Count);
  Serial.print("[-] SF9        : "); Serial.println(sf9Count);
  Serial.print("[-] SF10       : "); Serial.println(sf10Count);
  Serial.print("[-] SF11       : "); Serial.println(sf11Count);
  Serial.print("[-] SF12       : "); Serial.println(sf12Count);
  if (packetsReceived > 0) {
    float avgSaving = (sf7Count * 30.0 + sf8Count * 25.0 + sf9Count * 15.0 + sf10Count * 5.0) / packetsReceived;
    Serial.print("[-] Est. Saving: "); Serial.print(avgSaving, 1); Serial.println(" %");
  }
}
void analyzeEnergy(float temp, float humidity) {
  Serial.println();
  Serial.println("[*] ENERGY ANALYSIS");
  bool action = false;
  if (temp > TEMP_HIGH) {
    Serial.print("[!] Temperature HIGH: "); Serial.print(temp, 2); Serial.println(" C");
    Serial.println("    -> Cooling required");
    action = true;
  } else if (temp < TEMP_LOW) {
    Serial.print("[!] Temperature LOW: "); Serial.print(temp, 2); Serial.println(" C");
    Serial.println("    -> Heating required");
    action = true;
  } else {
    Serial.print("[+] Temperature OK: "); Serial.print(temp, 2); Serial.println(" C");
  }
  if (humidity > HUMIDITY_HIGH) {
    Serial.print("[!] Humidity HIGH: "); Serial.print(humidity, 2); Serial.println(" %");
    Serial.println("    -> Dehumidification required");
    action = true;
  } else if (humidity < HUMIDITY_LOW) {
    Serial.print("[!] Humidity LOW: "); Serial.print(humidity, 2); Serial.println(" %");
    Serial.println("    -> Humidification required");
    action = true;
  } else {
    Serial.print("[+] Humidity OK: "); Serial.print(humidity, 2); Serial.println(" %");
  }
  if (!action) {
    Serial.println("[+] All systems normal.");
    Serial.println("[+] Maximum energy saving mode.");
  }
}
