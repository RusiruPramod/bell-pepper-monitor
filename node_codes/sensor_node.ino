 // Sensor Node with ADR and Duty Cycling
// ESP32 + RA-02 LoRa + DHT11

#include <SPI.h>
#include <LoRa.h>
#include <DHT.h>
#include <WiFi.h>

// Configuration
#define NODE_ID 1
#define SLEEP_DURATION_MINUTES 5
#define SLEEP_DURATION_SECONDS ((uint32_t)(SLEEP_DURATION_MINUTES * 60.0))
#define uS_TO_S_FACTOR 1000000ULL

// LoRa settings 
#define LORA_FREQUENCY 433E6  // 433MHz (Asia/Africa) | 868E6 (EU) | 915E6 (US)
#define LORA_BANDWIDTH 125E3  

// ADR thresholds (set ADR_ENABLED to false for guaranteed Node 1-2 sync)
#define ADR_ENABLED false  // Disabled: ensures both nodes use same SF
#define ADR_RSSI_THRESHOLD_GOOD -50
#define ADR_RSSI_THRESHOLD_MEDIUM -70
#define ADR_RSSI_THRESHOLD_WEAK -90

// Duty cycle limits
#define DUTY_CYCLE_LIMIT_PERCENT 1.0
#define DUTY_CYCLE_WINDOW_MS 3600000

// Pins
#define LORA_SCK 18
#define LORA_MISO 19
#define LORA_MOSI 23
#define LORA_CS 5
#define LORA_RST 2
#define LORA_DIO0 4
#define DHT_PIN 15
#define DHT_TYPE DHT11

DHT dht(DHT_PIN, DHT_TYPE);

// RTC memory (survives deep sleep)
RTC_DATA_ATTR int bootCount = 0;
RTC_DATA_ATTR int transmissionCount = 0;
RTC_DATA_ATTR int currentSF = 7;
RTC_DATA_ATTR int currentTxPower = 14;
RTC_DATA_ATTR int lastRSSI = -50;
RTC_DATA_ATTR unsigned long totalTxTime = 0;
RTC_DATA_ATTR unsigned long windowStartTime = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);
  bootCount++;
  
  Serial.println("\n[*] IoT Sensor Node - ADR & Duty Cycling");
  Serial.print("[*] Boot: ");
  Serial.print(bootCount);
  Serial.print(" | TX Count: ");
  Serial.println(transmissionCount);
  
  // Init duty cycle tracking
  if (bootCount == 1) {
    windowStartTime = millis();
  }
  
  // Init sensor
  dht.begin();
  Serial.println("[+] DHT11 initialized");
  
  // Init LoRa
  Serial.println("[*] Initializing LoRa...");
  LoRa.setPins(LORA_CS, LORA_RST, LORA_DIO0);
  
  if (!LoRa.begin(LORA_FREQUENCY)) {
    Serial.println("[!] LoRa initialization failed");
    enterDeepSleep();
  }
  
  // Apply ADR parameters
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
  
  if (ADR_ENABLED) Serial.println("[*] ADR enabled");
  
  checkDutyCycle();
  readAndTransmit();
  enterDeepSleep();
}

void loop() {
  // Not used
}

void readAndTransmit() {
  Serial.println("\n[*] Reading sensor data...");
  
  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();
  
  if (isnan(humidity) || isnan(temperature)) {
    Serial.println("[!] Sensor read failed");
    return;
  }
  
  Serial.print("[+] Temp: ");
  Serial.print(temperature);
  Serial.print(" C | Humidity: ");
  Serial.print(humidity);
  Serial.println(" %");
  
  String packet = preparePacket(temperature, humidity);
  transmitLoRa(packet);
  
  transmissionCount++;
  
  if (ADR_ENABLED) applyADR();
}

String preparePacket(float temp, float hum) {
  // Format: NodeID,Temp,Hum,Boot,TX,SF,Power
  String packet = String(NODE_ID) + "," + 
                  String(temp, 1) + "," + 
                  String(hum, 1) + "," + 
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
  
  unsigned long txStart = millis();
  
  LoRa.beginPacket();
  LoRa.print(data);
  LoRa.endPacket();
  
  unsigned long txDuration = millis() - txStart;
  totalTxTime += txDuration;
  
  Serial.print("[+] TX complete: ");
  Serial.print(txDuration);
  Serial.println(" ms");
  
  float dutyCycle = calculateDutyCycle(txDuration);
  Serial.print("[-] Duty cycle: ");
  Serial.print(dutyCycle, 3);
  Serial.println(" %");
  
  delay(100);
}

void applyADR() {
  Serial.println("\n[*] ADR Analysis");
  
  int newSF = currentSF;
  int newTxPower = currentTxPower;
  
  Serial.print("[-] RSSI: ");
  Serial.print(lastRSSI);
  Serial.print(" dBm -> ");
  
  // Adjust based on signal strength
  if (lastRSSI > ADR_RSSI_THRESHOLD_GOOD) {
    newSF = 7;
    newTxPower = 14;
    Serial.println("Excellent (SF7, 14dBm)");
  } 
  else if (lastRSSI > ADR_RSSI_THRESHOLD_MEDIUM) {
    newSF = 9;
    newTxPower = 17;
    Serial.println("Good (SF9, 17dBm)");
  } 
  else if (lastRSSI > ADR_RSSI_THRESHOLD_WEAK) {
    newSF = 10;
    newTxPower = 20;
    Serial.println("Weak (SF10, 20dBm)");
  } 
  else {
    newSF = 12;
    newTxPower = 20;
    Serial.println("Very Weak (SF12, 20dBm)");
  }
  
  // Update if changed
  if (newSF != currentSF || newTxPower != currentTxPower) {
    currentSF = newSF;
    currentTxPower = newTxPower;
    Serial.println("[+] Parameters updated");
  } else {
    Serial.println("[-] No change required");
  }
  
  int powerSaving = ((20 - currentTxPower) * 5);
  Serial.print("[-] Power saving: ");
  Serial.print(powerSaving);
  Serial.println(" %");
}

void checkDutyCycle() {
  Serial.println("\n[*] Duty Cycle Status");
  
  unsigned long currentTime = millis();
  unsigned long windowElapsed = currentTime - windowStartTime;
  
  // Reset after 1 hour
  if (windowElapsed >= DUTY_CYCLE_WINDOW_MS) {
    Serial.println("[*] Window reset (1 hour elapsed)");
    totalTxTime = 0;
    windowStartTime = currentTime;
    windowElapsed = 0;
  }
  
  float currentDutyCycle = (float)totalTxTime / (float)windowElapsed * 100.0;
  float remainingTime = (DUTY_CYCLE_WINDOW_MS * DUTY_CYCLE_LIMIT_PERCENT / 100.0) - totalTxTime;
  
  Serial.print("[-] Total TX: ");
  Serial.print(totalTxTime);
  Serial.print(" ms | Window: ");
  Serial.print(windowElapsed / 1000);
  Serial.println(" s");
  Serial.print("[-] Current: ");
  Serial.print(currentDutyCycle, 3);
  Serial.print(" % (limit ");
  Serial.print(DUTY_CYCLE_LIMIT_PERCENT);
  Serial.println(" %)");
  Serial.print("[-] Remaining: ");
  Serial.print(remainingTime);
  Serial.println(" ms");
  
  if (currentDutyCycle > DUTY_CYCLE_LIMIT_PERCENT * 0.8) {
    Serial.println("[!] WARNING: Approaching limit");
  }
  
  if (currentDutyCycle >= DUTY_CYCLE_LIMIT_PERCENT) {
    Serial.println("[!] ERROR: Limit exceeded");
  }
}

float calculateDutyCycle(unsigned long recentTxTime) {
  unsigned long windowElapsed = millis() - windowStartTime;
  if (windowElapsed == 0) return 0;
  return (float)totalTxTime / (float)windowElapsed * 100.0;
}

void enterDeepSleep() {
  Serial.println("\n[*] Entering deep sleep mode");
  Serial.print("[-] Duration: ");
  Serial.print(SLEEP_DURATION_MINUTES);
  Serial.print(" min | Next config: SF");
  Serial.print(currentSF);
  Serial.print(", ");
  Serial.print(currentTxPower);
  Serial.println(" dBm");
  Serial.flush();
  
  esp_sleep_enable_timer_wakeup(SLEEP_DURATION_SECONDS * uS_TO_S_FACTOR);
  WiFi.mode(WIFI_OFF);
  btStop();
  esp_deep_sleep_start();
}
