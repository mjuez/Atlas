'use strict';

let t = new Date();

const isDev = require('electron-is-dev');
const {
    gui,
    Workspace,
    ExtensionsManager,
    TasksViewer
} = require(`electrongui`);
const {
    Menu,
    MenuItem
} = require('electron').remote;
const HelpExtension = require('helpextension');

//prevent app closing
document.addEventListener('dragover', function(event) {
    event.preventDefault();
    return false;
}, false);

document.addEventListener('drop', function(event) {
    event.preventDefault();
    return false;
}, false);
gui.startWaiting();
if (isDev) {
    gui.addMenuItem(new MenuItem({
        label: "Dev",
        type: 'submenu',
        submenu: Menu.buildFromTemplate([{
            label: 'toggledevtools',
            role: "toggledevtools"
        }])
    }));
}
gui.addMenuItem(new MenuItem({
    label: "File",
    type: "submenu",
    submenu: Menu.buildFromTemplate([
      {
        label: 'New Workspace'
      },
      {
       label: 'Open Workspace'
      },
      {
        label: 'Save Workspace'
      },
      {
        label: 'Save Workspace as'
      },
      {
        label: 'Quit',
        role: 'quit'
    }])
}));
gui.extensionsManager = new ExtensionsManager();
gui.workspace = new Workspace();
gui.HelpExtension = new HelpExtension();
gui.TasksViewer = new TasksViewer();
gui.TasksViewer.activate();
gui.HelpExtension.activate();


gui.stopWaiting();
gui.viewTrick();
gui.notify(`App loaded in ${(new Date())-t} ms`);

//module.exports = gui;
