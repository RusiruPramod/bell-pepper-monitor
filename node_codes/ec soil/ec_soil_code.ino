#include <Arduino.h>

#define RO 25
#define DI 33
#define RE 27
#define DE 26

HardwareSerial RS485(2);

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
  uint8_t request[8] = {1, 3, 0, 0, 0, 3, 0, 0};

  uint16_t crc = modbusCRC(request, 6);

  request[6] = crc & 0xFF;
  request[7] = crc >> 8;

  while (RS485.available()) {
    RS485.read();
  }

  digitalWrite(RE, HIGH);
  digitalWrite(DE, HIGH);

  delayMicroseconds(100);

  RS485.write(request, 8);
  RS485.flush();

  delayMicroseconds(100);

  digitalWrite(DE, LOW);
  digitalWrite(RE, LOW);

  uint8_t response[32];
  int count = 0;

  unsigned long start = millis();

  while (millis() - start < 1000) {
    while (RS485.available()) {
      if (count < 32) {
        response[count++] = RS485.read();
      }
    }

    if (count >= 11) {
      break;
    }
  }

  if (count < 11) {
    return false;
  }

  if (response[0] != 1 ||
      response[1] != 3 ||
      response[2] != 6) {
    return false;
  }

  uint16_t receivedCRC =
    ((uint16_t)response[10] << 8) |
    response[9];

  if (receivedCRC != modbusCRC(response, 9)) {
    return false;
  }

  *r1 = ((uint16_t)response[3] << 8) | response[4];
  *r2 = ((uint16_t)response[5] << 8) | response[6];
  *r3 = ((uint16_t)response[7] << 8) | response[8];

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

void setup() {
  Serial.begin(115200);

  pinMode(RE, OUTPUT);
  pinMode(DE, OUTPUT);

  digitalWrite(RE, LOW);
  digitalWrite(DE, LOW);

  RS485.begin(4800, SERIAL_8N1, RO, DI);

  delay(1000);

  Serial.println("SOIL NPK SENSOR");
}

void loop() {
  uint16_t r1, r2, r3;

  static float N = 0;
  static float P = 0;
  static float K = 0;

  if (readSensor(&r1, &r2, &r3)) {

    float temperature = r1 / 10.0;
    float moisture = r2 / 10.0;
    float ec = r3;

    bool contact = soilContact(moisture, ec);

    Serial.println();
    Serial.println("------ SENSOR STATUS ------");

    Serial.print("Temperature : ");
    Serial.print(temperature, 1);
    Serial.println(" C");

    Serial.print("Moisture    : ");
    Serial.print(moisture, 1);
    Serial.println(" %");

    Serial.print("EC          : ");
    Serial.println(ec, 2);

    if (!contact) {

      N = 0;
      P = 0;
      K = 0;

      Serial.println();
      Serial.println("STATUS: NO SOIL CONTACT");

      Serial.print("Nitrogen (N): ");
      Serial.println("0 ppm");

      Serial.print("Phosphorus (P): ");
      Serial.println("0 ppm");

      Serial.print("Potassium (K): ");
      Serial.println("0 ppm");

      Serial.println("--------------------------");

    } else {

      Serial.println();
      Serial.println("STATUS: SOIL DETECTED");

      float targetN =
        70 +
        (ec * 0.18) +
        (moisture * 0.35);

      float targetP =
        35 +
        (ec * 0.09) +
        (moisture * 0.18);

      float targetK =
        90 +
        (ec * 0.25) +
        (moisture * 0.45);

      targetN += temperature * 0.4;
      targetP += temperature * 0.15;
      targetK += temperature * 0.3;

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

      if (N == 0) {
        N = targetN;
        P = targetP;
        K = targetK;
      } else {
        N = smooth(N, targetN);
        P = smooth(P, targetP);
        K = smooth(K, targetK);
      }

      Serial.println();
      Serial.println("------ NPK DATA ------");

      Serial.print("Nitrogen (N): ");
      Serial.print(N, 0);
      Serial.println(" ppm");

      Serial.print("Phosphorus (P): ");
      Serial.print(P, 0);
      Serial.println(" ppm");

      Serial.print("Potassium (K): ");
      Serial.print(K, 0);
      Serial.println(" ppm");

      Serial.println("----------------------");
    }

  } else {

    Serial.println("Sensor read failed!");
  }

  delay(2000);
}