// All Node.js APIs are available in the preload process.
const { contextBridge, ipcRenderer } = require('electron')
const Chart = require('chart.js');

// IPC for switching pages
contextBridge.exposeInMainWorld('electronIPC', {
  switchPage: (mssg) => ipcRenderer.send('switchPage', mssg)
})

// Chart.js
let ctx;
let chart;
contextBridge.exposeInMainWorld(
  'electronChart',
  {
    createChart: (id, params) => {
      ctx = document.getElementById(id);
      chart = new Chart(ctx, params);
    },
    updateChart: (xLabels, datasetsLabel, datasetsData, datasetsBorderColor) => {
      chart.data.labels = xLabels;
      for (let i = 0; i < datasetsLabel.length; i++) {
        chart.data.datasets[i].label = datasetsLabel[i];
        chart.data.datasets[i].data = datasetsData[i];
        chart.data.datasets[i].borderColor = datasetsBorderColor[i];
      }
      chart.update();
    }
  }
)
