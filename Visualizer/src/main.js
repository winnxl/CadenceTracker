const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const { type } = require('os');
const path = require('path')  // For preload.js

// app.commandLine.appendSwitch('enable-features', 'ElectronSerialChooser')

// Application Menu - Top Bar
const template = [
  {
    label: 'Port',
    submenu: []
  }
]

// TODO: move this to new main window
const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);

// Load Serial Ports to Application Menu
function loadPortsToMenu(ports) {
  // Clear Sub menu
  template.find(x => x.label === "Port").submenu = [{ label: "None", type: "radio", checked: true }];

  // Load Sub menu
  for (let port of ports) {
    console.log(port.portName, port.displayName);
    const submenuItem = {
      // label: port.portName + ": " + port.displayName,
      label: port.displayName,
      sublabel: port.portName,
      type: "radio",
      checked: false,
      click: () => console.log(port.portName)
    }
    template.find(x => x.label === "Port").submenu.push(submenuItem);
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
      // enableBlinkFeatures: 'Serial'
    }
  })

  mainWindow.webContents.session.on('select-serial-port', (event, portList, webContents, callback) => {
    // console.log('SELECT-SERIAL-PORT:', portList);

    // Load to menu if template is empty
    if (template.find(x => x.label === "Port").submenu.length == 0) {
      console.log("Loading Ports")
      loadPortsToMenu(portList);
    }
    event.preventDefault();

    // Select port if one is selected (Not None)
    if (!Menu.getApplicationMenu().items.find(x => x.label === "Port").submenu.items.find(x => x.label === "None").checked) {
      // Match portName with selected sublabel
      let selectedPort = portList.find((device) => {
        return device.portName === Menu.getApplicationMenu().items.find(x => x.label === "Port").submenu.items.find(item => item.checked).sublabel
      });
      callback(selectedPort.portId)
    }
    // No Port is Selected
    else {
      callback('')
    }
  })

  // mainWindow.webContents.session.on('serial-port-added', (event, port) => {
  //   console.log('serial-port-added FIRED WITH', port);
  //   event.preventDefault();
  // })

  // mainWindow.webContents.session.on('serial-port-removed', (event, port) => {
  //   console.log('serial-port-removed FIRED WITH', port);
  //   event.preventDefault();
  // })

  // mainWindow.webContents.session.on('select-serial-port-cancelled', () => {
  //   console.log('select-serial-port-cancelled FIRED.');
  // })

  // mainWindow.webContents.session.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
  //   // This permission check handler is not needed by default but available if you want to limit serial requests
  //   console.log(`In PermissionCheckHandler`);
  //   console.log(`Webcontents url: ${webContents.getURL()}`);
  //   console.log(`Permission: ${permission}`);
  //   console.log(`Requesting Origin: ${requestingOrigin}`, details);  
  //   return true;
  // });  

  // and load the index.html of the app.
  mainWindow.loadFile('src/session/session.html') // TODO: Change back to index.html later. 

  // Open the DevTools.
  mainWindow.webContents.openDevTools()

  // console.log(mainWindow.webContents)
  return mainWindow
}

// Called when Electron finished init. Ready to create browser windows
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  const mainWindow = createWindow()

  // IPC Handlers
  ipcMain.on('switchPage', (event, mssg) => {   // switchPage event
    // let destination;
    switch (mssg) {
      case 'index':
        destination = 'src/index/index.html'
        break;
      case 'session':
        destination = 'src/session/session.html'
        break;
      default:
        destination = 'src/index/index.html'
    }
    mainWindow.loadFile(destination);
  })

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

