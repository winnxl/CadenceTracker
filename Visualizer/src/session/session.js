/*
Usage
1. Click "Load/Get Ports" to load ports into menu
2. Select port in menu
3. Click "Load/Get Ports" to select port
4. Click "Connect" to connect and stream data
5. Click "Disconnect" to disconnect and close stream
*/

// Cadence Vars
var sensorRevs = null; // Number of revolutions from sensor data
let sensorRevsArr = [];
let startDateTime = null;
let endDateTime = null;

// TMP 
let movingAverage3sArr = [];

// Serial Port
let port;

// For Reading / Connect / Disconnect
let keepReading;  // TODO: Maybe refactor. Also used by display stuff to know if stream is running (update display)
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
  iidRpm3s = setInterval(displayRpm3s, 500);
  iUpdateSensorRevsArr = setInterval(pushSensorRevsToArr, 500);

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

  clearInterval(iidRpm3s);
  clearInterval(iUpdateSensorRevsArr);
  endDateTime = new Date();
  console.log(sensorRevsArr);
  console.log((endDateTime - startDateTime) / 1000);
}


// Update Sensor Revolutions
function updateSensorRevs(num) {
  sensorRevs = num;
  displaySensorRevs();  // TODO: Consider refactoring this for another function to handle
}

// Display Sensor Revolutions
function displaySensorRevs() {
  document.getElementById('revolutions').textContent = sensorRevs;
}

// Display RPM 3S
function displayRpm3s() {
  diff = (sensorRevsArr[sensorRevsArr.length - 1] - sensorRevsArr[sensorRevsArr.length - 7]) / 3; // 6 samples, sample every 0.5 second for 3 second moving average

  document.getElementById('rpm3s').textContent = diff.toFixed(1);
  movingAverage3sArr.push(diff);

  oldRpm3sRevs = sensorRevs;
  return diff;
}

// Helper - Update Array
function pushSensorRevsToArr() {
  sensorRevsArr.push(sensorRevs);

  // TODO wrap below and containing function in a different update function. Link interval to new update function
  updateChartData();
  updateChart();
}


// Run RPM3s every 3s
let iidRpm3s;
// Interval to update every half second
let iUpdateSensorRevsArr;

// Chart Data Update
function display3sMA() {

}

// TODO make these things calculated
function updateChartData() {
  let timeWindow = 30; // 30 seconds
  let samples = 2; // 2 data points per second
  let maxPoints = timeWindow * samples;
  let nPoints = Math.min(maxPoints, sensorRevsArr.length)
  let offset = 0;
  if (sensorRevsArr.length > maxPoints) {
    offset = (sensorRevsArr.length - maxPoints) / 2;
  }
  chartXLabels = Array.from({ length: nPoints }, (v, i) => i * 0.5 + offset);

  if (movingAverage3sArr.length > maxPoints){
    chartDatasetData[0] = movingAverage3sArr.slice(movingAverage3sArr.length - maxPoints);
  } else {
    chartDatasetData[0] = movingAverage3sArr;
  }
}


// Chart
const id_chart = 'canvas_chart';
const chartDatasetLabels = ['3S MA'];
const chartBorderColor = ['rgb(75, 192, 192)']  // TODO Make this dynamic. RN may run of of colors

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
          borderColor: null
        }
      ]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

function updateChart() {
  window.electronChart.updateChart(chartXLabels, chartDatasetLabels, chartDatasetData, chartBorderColor);
}
createChart();

// TODO: Reactor intervals and closers to start/stop functions. Add these to the stream open/close.

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
