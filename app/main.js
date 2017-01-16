
const {
    fork,
    exec
} = require('child_process')
const {
    app,
    BrowserWindow
} = require('electron')
const path = require('path')
const {
    ipcMain
} = require('electron')


// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win



function createWindow() {

     let frame=true;

     if (process.platform === "linux" | process.platform === "darwin"){
       frame = true;
     }
    // Create the browser window.
    win = new BrowserWindow({
        width: 900,
        height: 600,
        frame: frame,
        titleBarStyle:'hidden',
        icon: 'icon.png'
    })

    // and load the index.html of the app.
    win.loadURL(`file://${__dirname}/index.html`)

    // Open the DevTools.
   //win.webContents.openDevTools()



    // Emitted when the window is closed.
    win.on('closed', () => {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        win = null
    })
}



app.commandLine.appendSwitch("disable-renderer-backgrounding");

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (win === null) {
        createMainWindow()
    }
})

ipcMain.on("focusWindow", () =>{
  win.focus();
})

ipcMain.on("openDevTools", () =>{
  win.webContents.openDevTools()
})


ipcMain.on("mapViewTrick", () => {
    win.setSize(win.getSize()[0] + 1, win.getSize()[1] + 1)
    win.setSize(win.getSize()[0] - 1, win.getSize()[1] - 1)
})

ipcMain.on("imageJ",(event,arg)=>{
  let path = app.getPath('exe');
  exec('java -Xmx512m -jar ij.jar',{cwd:`${process.resourcesPath}/ImageJ/`},(error, stdout, stderr)=>{})
})

ipcMain.on('setProgress',(event,arg)=>{
  win.setProgressBar(arg.value);
});
