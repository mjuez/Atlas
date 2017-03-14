const {
    fork,
    exec
} = require('child_process')
const {
    app,
    BrowserWindow,
    Tray,
    Menu,
    dialog
} = require('electron')
const path = require('path')
const {
    ipcMain
} = require('electron')


// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win
let minHeight = 65;
let trayimg = `${__dirname}/icon.png`
if (process.platform === 'win32') {
    minHeight = 100;
    trayimg = `${__dirname}/icon.ico`
}




function createWindow() {

    let frame = true;
    if (process.platform === "linux" | process.platform === "darwin") {
        frame = true;
    }
    // Create the browser window.
    win = new BrowserWindow({
        width: 900,
        height: minHeight,
        frame: frame,
        titleBarStyle: 'hidden',
        icon: `${__dirname}/icon.png`
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

// app.on('ready', () => {
//     tray = new Tray(trayimg)
//     const contextMenu = Menu.buildFromTemplate([{
//             label: 'Show',
//             type: 'normal',
//             click: () => {
//               win.show()
//             }
//         },
//         {
//             label: 'Minimize',
//             type: 'normal',
//             click: ()=>{
//               win.hide();
//             }
//         },
//         {
//             label: 'Quit',
//             type: 'normal',
//             click: ()=>{
//               dialog.showMessageBox({
//                 type: 'question',
//                 buttons: ['No', 'Yes'],
//                 title: 'Atlas',
//                 message: 'Do you really want to quit?',
//                 detail: 'all unsaved data will be lost',
//                 noLink: true
//               },(id)=>{
//                 if (id>0){
//                   app.quit();
//                 }
//               })
//             }
//         }
//     ])
//     tray.setToolTip('Atlas')
//     tray.setContextMenu(contextMenu)
// })


//Quit when all windows are closed.
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

ipcMain.on("focusWindow", () => {
    win.focus();
})

ipcMain.on("openDevTools", () => {
    win.webContents.openDevTools()
})



ipcMain.on("imageJ", (event, arg) => {
    let path = app.getPath('exe');
    exec('java -Xmx512m -jar ij.jar', {
        cwd: `${process.resourcesPath}/ImageJ/`
    }, (error, stdout, stderr) => {})
})

ipcMain.on('setProgress', (event, arg) => {
    win.setProgressBar(arg.value);
});
