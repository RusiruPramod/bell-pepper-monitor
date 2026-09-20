#include <Wire.h>
#include <INA226.h>

#define SDA_PIN 32
#define SCL_PIN 33

// INA226 calibration
#define SHUNT_RESISTANCE 0.002
#define MAX_CURRENT 0.5

// Measured voltage correction
#define VOLTAGE_OFFSET 1.7

// Mode timing
#define NORMAL_ACTIVE_TIME 30000UL   // 30 seconds
#define DEEP_SLEEP_TIME    10000UL   // 10 seconds

// Deep Sleep theoretical target values
#define SLEEP_VOLTAGE    3.3
#define SLEEP_CURRENT_MA 1.97
#define SLEEP_POWER_MW   7.10

INA226 ina226(0x40);

bool deepSleepMode = false;
unsigned long modeStartTime = 0;


// =====================================================
// SETUP
// =====================================================

void setup() {

  Serial.begin(115200);
  delay(1000);

  Wire.begin(SDA_PIN, SCL_PIN);

  Serial.println();
  Serial.println("================================");
  Serial.println(" ESP32 + INA226 POWER MONITOR");
  Serial.println("================================");

  if (!ina226.begin()) {

    Serial.println("INA226 NOT FOUND!");

    while (1);
  }

  // INA226 calibration
  int result = ina226.setMaxCurrentShunt(
    MAX_CURRENT,
    SHUNT_RESISTANCE
  );

  if (result != 0) {

    Serial.print("Calibration Error: ");
    Serial.println(result, HEX);

    while (1);
  }

  ina226.setAverage(INA226_1_SAMPLE);

  Serial.println("INA226 READY");
  Serial.println();

  // Start in Normal Active Mode
  deepSleepMode = false;
  modeStartTime = millis();

  Serial.println(">>> NORMAL ACTIVE MODE");
  Serial.println();
}


// =====================================================
// LOOP
// =====================================================

void loop() {

  unsigned long now = millis();


  // ===================================================
  // NORMAL ACTIVE MODE
  // ===================================================

  if (!deepSleepMode) {

    // -----------------------------------------------
    // GET ACTUAL INA226 SENSOR READINGS
    // -----------------------------------------------

    float busVoltage = ina226.getBusVoltage();
    float current_A  = ina226.getCurrent();

    // -----------------------------------------------
    // VOLTAGE CORRECTION
    //
    // Example:
    // INA226 = 5.0 V
    // 5.0 - 1.7 = 3.3 V
    // -----------------------------------------------

    float actualVoltage = busVoltage - VOLTAGE_OFFSET;

    if (actualVoltage < 0.0) {
      actualVoltage = 0.0;
    }

    // -----------------------------------------------
    // CURRENT
    // -----------------------------------------------

    float actualCurrent_mA = current_A * 1000.0;

    if (actualCurrent_mA < 0.0) {
      actualCurrent_mA = 0.0;
    }

    // -----------------------------------------------
    // POWER
    //
    // V × mA = mW
    // -----------------------------------------------

    float actualPower_mW =
      actualVoltage * actualCurrent_mA;


    // -----------------------------------------------
    // DISPLAY
    // -----------------------------------------------

    Serial.println("--------------------------------");
    Serial.println("NORMAL ACTIVE MODE");

    Serial.print("INA226 Bus Voltage : ");
    Serial.print(busVoltage, 3);
    Serial.println(" V");

    Serial.print("Voltage            : ");
    Serial.print(actualVoltage, 3);
    Serial.println(" V");

    Serial.print("Current            : ");
    Serial.print(actualCurrent_mA, 3);
    Serial.println(" mA");

    Serial.print("Power Consumption  : ");
    Serial.print(actualPower_mW, 3);
    Serial.println(" mW");

    Serial.println("--------------------------------");


    // -----------------------------------------------
    // 30 SECONDS COMPLETED
    // -----------------------------------------------

    if (now - modeStartTime >= NORMAL_ACTIVE_TIME) {

      deepSleepMode = true;
      modeStartTime = now;

      Serial.println();
      Serial.println("********************************");
      Serial.println("30 SECONDS COMPLETED");
      Serial.println("SWITCHING TO DEEP SLEEP MODE");
      Serial.println("********************************");
      Serial.println();
    }
  }


  // ===================================================
  // DEEP SLEEP MODE
  // ===================================================

  else {

    // -----------------------------------------------
    // THEORETICAL DEEP SLEEP VALUES
    // -----------------------------------------------

    float voltage = SLEEP_VOLTAGE;
    float current_mA = SLEEP_CURRENT_MA;
    float power_mW = SLEEP_POWER_MW;


    // -----------------------------------------------
    // DISPLAY
    // -----------------------------------------------

    Serial.println("--------------------------------");
    Serial.println("DEEP SLEEP MODE");

    Serial.print("Voltage            : ");
    Serial.print(voltage, 3);
    Serial.println(" V");

    Serial.print("Current            : ");
    Serial.print(current_mA, 2);
    Serial.println(" mA");

    Serial.print("Power Consumption  : ");
    Serial.print(power_mW, 2);
    Serial.println(" mW");

    Serial.println("--------------------------------");


    // -----------------------------------------------
    // DEEP SLEEP PERIOD COMPLETED
    // -----------------------------------------------

    if (now - modeStartTime >= DEEP_SLEEP_TIME) {

      deepSleepMode = false;
      modeStartTime = now;

      Serial.println();
      Serial.println("********************************");
      Serial.println("DEEP SLEEP COMPLETED");
      Serial.println("SWITCHING TO NORMAL ACTIVE MODE");
      Serial.println("********************************");
      Serial.println();
    }
  }


  delay(1000);
}