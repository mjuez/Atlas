let t = new Date();
//prevent app closing
document.addEventListener('dragover', function(event) {
    event.preventDefault();
    return false;
}, false);

document.addEventListener('drop', function(event) {
    event.preventDefault();
    return false;
}, false);
console.log('aaa');
const {gui, Workspace, ExtensionsManager} = require(`electrongui`);
console.log('bbb');
gui.startWaiting();
if ()
gui.extensionsManager = new ExtensionsManager();
gui.workspace = new Workspace();
//gui.extensionsManager.loadAllExtensions();

gui.extensionsManager.on('load:all', () => {
    // gui.extensionsManager.extensions.mapPage.activate();
    // gui.extensionsManager.extensions.regionStatsPage.activate();
    // gui.extensionsManager.extensions.tasksPage.activate();
    // gui.extensionsManager.extensions.helpPage.activate();
    // gui.extensionsManager.extensions.imagej.activate();
    gui.stopWaiting();
    gui.setProgress(0);
  //  gui.extensionsManager.extensions.mapPage.show();
    gui.viewTrick();
    gui.notify(`App loaded in ${(new Date())-t} ms`);
});

module.exports = gui;
