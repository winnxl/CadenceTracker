/*
  BTCS
*/

#include <SoftwareSerial.h>
SoftwareSerial MyBlue(10, 11); // (TX, RX on HC-05)

const int  sensorPin = 4;    // Tilt Sensor
const int ledPin = 3;       // External LED pin

int lastRead = 1;   // Tilt Switch Read 1 = HIGH (Default if sitting right side up)
unsigned int totalCounter = 0;    // 0 to 65,535
int delayCounter = 0; // Loops 0-9 for 50 ms delay

void setup() {
  // inits
  pinMode(sensorPin, INPUT);
  pinMode(ledPin, OUTPUT);

  Serial.begin(9600); // Serial Monitor
  MyBlue.begin(9600);

  Serial.println("Password is 1234 or 000");
  digitalWrite(ledPin, HIGH);

  if (MyBlue.isListening()) {
    Serial.write("Is Listening\n");
  }
}


void loop()
{
  // Send new total every half second
  if (delayCounter >= 9 ) {
    //int w = MyBlue.println(totalCounter);
    MyBlue.println(totalCounter);
  }

  //Switch
  if (digitalRead(sensorPin) == LOW && lastRead == 1) {
    totalCounter++;

    //    Serial.print("Total Cycled: ");
    //    Serial.println(totalCounter);
    //    digitalWrite(ledPin, LOW);
    lastRead = 0;
  }
  else if (digitalRead(sensorPin) == HIGH && lastRead == 0) {
    //digitalWrite(ledPin, HIGH);
    analogWrite(ledPin, 63); // 0-255
    lastRead = 1;
  }

  delayCounter = (delayCounter + 1) % 10; // If delay of 50, resets to 0 every half second
  delay(50);
}
