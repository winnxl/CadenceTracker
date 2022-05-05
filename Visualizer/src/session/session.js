/*
Usage
1. Click "Load/Get Ports" to load ports into menu
2. Select port in menu
3. Click "Load/Get Ports" to select port
4. Click "Connect" to connect and stream data
5. Click "Disconnect" to disconnect and close stream
*/

// Cadence Vars
let sensorRevs = null; // Number of revolutions from sensor data
let sensorRevsArr = [];
let startDateTime = null;
let endDateTime = null;

// Cadence Helper Arrays 
let rpmArr = [];  // RPM Array

// Sensor Properties
let samplesPerSecond = 2;

// Serial Port
let port;

// For Reading / Connect / Disconnect
let keepReading;
let reader;
let closedPromise;

// Transform Stream of String to Numbers
class TransformStreamStringToNumber {
  constructor() {
    this.chunks = ""; // Collects stream until new line is detected
  }

  // Process incoming chunks
  transform(chunk, controller) {
    this.chunks += chunk;
    const lines = this.chunks.split("\r\n");  // Split chunks into lines
    this.chunks = lines.pop();  // Send last item back to chunk. Could be part of a line or a empty line.
    lines.forEach((line) => controller.enqueue(Number(line)));
  }

  // Flush stream when stream is closed
  flush(controller) {
    controller.enqueue(this.chunks);
  }
}

// Load and Select port
async function loadGetPorts() {
  const existingPermissions = await navigator.serial.getPorts();
  console.log("Existing port permissions: ", existingPermissions);

  port = await navigator.serial.requestPort();
  console.log('Selected port', port.getInfo());

  const updatedPermissions = await navigator.serial.getPorts();
  console.log("Port permissions after navigator.serial.requestPort:", updatedPermissions);
}

// Connect to port and start streaming data
async function connect() {
  if (port) {
    console.log("Opening Port...")
    const portOptions = {
      baudRate: 9600,
      // dataBits: 8
      // parity: "none",
    }
    await port.open(portOptions);
    keepReading = true;
    closedPromise = readUntilClosed();
  }
}

// Reads data with Transform Stream
async function readUntilClosed() {
  startDateTime = new Date();
  i500 = setInterval(update500, 500);

  let textDecoder, readableStreamClosed;
  while (port.readable && keepReading) {
    textDecoder = new TextDecoderStream();
    readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
    reader = textDecoder.readable
      .pipeThrough(new TransformStream(new TransformStreamStringToNumber()))
      .getReader();
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {   // reader.cancel() called
          break;
        }
        // console.log(value);
        updateSensorRevs(value);
      }
    } catch (error) {
    } finally {
      reader.releaseLock();   // Allow serial port to be closed later.
    }
  }
  await readableStreamClosed.catch(() => { }); // Ignore Error
  await port.close();
  console.log("Port Closed");
}

// Disconnect for both Uint8Array and Transform Versions of read data
async function disconnect() {
  console.log("Disconnecting Port...");
  keepReading = false;  // stop outer loop in readUntilClosed()
  reader.cancel();  // makes "done" true in readUntilClosed() to break inner loop and subsequently reader.releaseLock()
  await closedPromise;

  clearInterval(i500);
  endDateTime = new Date();
  console.log(sensorRevsArr);
  console.log((endDateTime - startDateTime) / 1000);
}


// Update Sensor Revolutions
function updateSensorRevs(num) {
  sensorRevs = num;
  displaySensorRevs();  // TODO: Consider refactoring this for another function to handle
}

// Update SensorRevs Array
function updateSensorRevsArr() {
  sensorRevsArr.push(sensorRevs);
}

// Display Sensor Revolutions
function displaySensorRevs() {
  document.getElementById('revolutions').textContent = sensorRevs;
}

// Update RPM Array
// Currently using last 6 seconds at 2 samples per second
function updateRpmArr() {
  let window = 6;   // Window of time (seconds) used to calculate moving average for rpm
  let leftIndex = sensorRevsArr.length - (samplesPerSecond * window + 1);
  let rightIndex = sensorRevsArr.length - 1;
  let multiplier = 60 / window;
  diff = (sensorRevsArr[rightIndex] - sensorRevsArr[leftIndex]) * multiplier; 
  rpmArr.push(diff);
}

function displayRPM() {
  document.getElementById('rpm').textContent = rpmArr[rpmArr.length - 1].toFixed(0);  // Display with 0 Decimal Places
}

// Chart
const id_chart = 'canvas_chart';
const chartDatasetLabels = ['RPM (Based on last 6 seconds)'];
const chartBorderColor = ['rgb(75, 192, 192)']  // Cyan

let chartXLabels = [];
const chartDatasetData = [[]];

function createChart() {
  window.electronChart.createChart(id_chart, {
    type: 'line',
    data: {
      labels: null,
      datasets: [
        {
          label: [],
          data: [],
          fill: true,       // Area under line
          borderColor: null,
          tension: 0.5      // Smooth line
        }
      ]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          max: 150          // Up to 150 rpm on y-axis
        }
      }
    }
  });
}

// Update Chart Data
function updateChartData() {
  let timeWindow = 30;  // 30 second window
  let maxPoints = timeWindow * samplesPerSecond;
  let nPoints = Math.min(maxPoints, sensorRevsArr.length);  // Number of points being displayed on chart
  let offset = 0;

  if (sensorRevsArr.length > maxPoints) {
    offset = (sensorRevsArr.length - maxPoints) / 2;
  }

  chartXLabels = Array.from({ length: nPoints }, (v, i) => i * 0.5 + offset);

  if (rpmArr.length > maxPoints) {
    chartDatasetData[0] = rpmArr.slice(rpmArr.length - maxPoints);
  } else {
    chartDatasetData[0] = rpmArr;
  }
}

// Update Chart Display
function updateChart() {
  window.electronChart.updateChart(chartXLabels, chartDatasetLabels, chartDatasetData, chartBorderColor);
}

// Interval functions
let i500;

// Run every 500 ms
function update500() {
  // Total Revs
  updateSensorRevsArr();
  displaySensorRevs;
  // RPM
  updateRpmArr();
  displayRPM();
  // Chart (RPM)
  updateChartData();
  updateChart();
}


// Document
createChart();

// Display whether Web Serial API is supported
document.getElementById("serial-supported").textContent = "serial" in navigator ? "True" : "False";

// Buttons
document.getElementById('button_loadGetPorts').addEventListener('click', loadGetPorts);
document.getElementById('button-connect').addEventListener('click', connect);
document.getElementById('button-disconnect').addEventListener('click', disconnect);

document.getElementById('button_index').addEventListener('click', () => {
  window.electronIPC.switchPage('index');
});

/* Unused Functions */

// Reads data as Uint8Array
// async function readUntilClosed() {
//   while (port.readable && keepReading) {
//     reader = port.readable.getReader();
//     try {
//       while (true) {
//         const { value, done } = await reader.read();
//         if (done) {   // reader.cancel() called
//           break;
//         }
//         console.log(value);
//       }
//     } catch (error) {
//     } finally {
//       reader.releaseLock();   // Allow serial port to be closed later.
//     }
//   }
//   await port.close();
// }
