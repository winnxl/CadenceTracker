// All Node.js APIs are available in the preload process.
const { contextBridge, ipcRenderer } = require('electron')

// IPC for switching pages
contextBridge.exposeInMainWorld('electronAPI', {
    switchPage: (mssg) => ipcRenderer.send('switchPage', mssg)
})
