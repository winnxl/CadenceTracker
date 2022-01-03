/*
  BTCS
*/

#include <SoftwareSerial.h>
SoftwareSerial MyBlue(10, 11); // (TX, RX on HC-05)

const int  sensorPin = 4;    // Tilt Sensor
//const int ledPin = 13;       // LED pin (13 is onboard)

int lastRead = 1;   // 1 = HIGH (Tilt Sensor is standing up)
unsigned int totalCounter = 0;    // 0 to 65,535
int loopDelay = 50; // delay at the end of each loop()
int transmitDelay = 500; // BT Module transmission delay - data gets corrupted/congested if too low
int transmitCooldown = transmitDelay;

void setup() {
  // inits
  pinMode(sensorPin, INPUT);
  //  pinMode(ledPin, OUTPUT);

  //  Serial.begin(9600); // Serial Monitor
  MyBlue.begin(9600);

  //  Serial.println("Ready to connect\nDefualt password is 1234 or 000");
  //  if (MyBlue.isListening()) {
  //    Serial.write("Is Listening\n");
  //  }
}


void loop()
{
  // Transmit Total
  if (transmitCooldown <= 0) {
    MyBlue.println(totalCounter);
    transmitCooldown = transmitDelay;
  }

  // Register Tilts
  if (digitalRead(sensorPin) == LOW && lastRead == 1) {
    lastRead = 0;
    totalCounter++;
    //Serial.println(totalCounter);
    //digitalWrite(ledPin, LOW);
  }
  else if (digitalRead(sensorPin) == HIGH && lastRead == 0) {
    lastRead = 1;
    //digitalWrite(ledPin, HIGH);
  }

  transmitCooldown -= loopDelay;
  delay(loopDelay);
}
