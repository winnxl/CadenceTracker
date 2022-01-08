/*
Usage
1. Click "Test" to load ports into menu
2. Select port in menu
3. Click "Test" to select port
4. Click "Connect" to connect and stream data
5. Click "Disconnect" to disconnect and close stream
*/

var port;

let keepReading = true;
let reader;
var closedPromise;

async function test() {
  const existingPermissions = await navigator.serial.getPorts();
  console.log("Existing port permissions: ", existingPermissions);

  port = await navigator.serial.requestPort();
  console.log('Selected port', port.getInfo());

  const updatedPermissions = await navigator.serial.getPorts();
  console.log("Port permissions after navigator.serial.requestPort:", updatedPermissions);
}

async function connect() {
  if (port) {
    console.log("opening port")
    const portOptions = {
      baudRate: 9600,
      // dataBits: 8
      // parity: "none",
    }
    await port.open(portOptions);
    closedPromise = readUntilClosed();
  }
}

// Reads data as Uint8Array
async function readUntilClosed() {
  while (port.readable && keepReading) {
    reader = port.readable.getReader();
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {   // reader.cancel() called
          break;
        }
        console.log(value);
      }
    } catch (error) {
    } finally {
      reader.releaseLock();   // Allow serial port to be closed later.
    }
  }
  await port.close();
}

async function disconnect() {
  keepReading = false;  // stop outer loop in readUntilClosed()
  reader.cancel();  // makes "done" true in readUntilClosed() to break inner loop and subsequently reader.releaseLock()
  await closedPromise;
  console.log("Port Closed");
}

// Display whether Web Serial API is supported
document.getElementById("serial-supported").textContent = "serial" in navigator ? "True" : "False";

// Buttons
document.getElementById('button-test').addEventListener('click', test);
document.getElementById('button-connect').addEventListener('click', connect);
document.getElementById('button-disconnect').addEventListener('click', disconnect);