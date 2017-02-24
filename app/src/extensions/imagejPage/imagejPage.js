/**
 * @author : gherardo varando (gherardo.varando@gmail.com)
 *
 * @license: GPL v3
 *     This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.


 */

"use strict";
const isDev = require('electron-is-dev');
const os = require('os');
const Util = require('Util');
const {
    dialog,
    Menu,
    MenuItem
} = require('electron').remote;
const {
    exec,
    spawn
} = require('child_process');
const GuiExtension = require('GuiExtension');
const ToggleElement = require('ToggleElement');
const {
    app
} = require('electron').remote;
const MapIO = require('../mapPage/_modules/MapIO.js');
const path = require('path');
const Modal = require('Modal');
const Grid = require('Grid');
const FolderSelector = require('FolderSelector');
const ButtonsContainer = require('ButtonsContainer');
const fs = require('fs');
const TaskManager = require('TaskManager');
const MapCreatorTask = require('MapCreatorTask');
const ObjectDetectionTask = require('ObjectDetectionTask');
const HolesDetectionTask = require('HolesDetectionTask');
const CropTask = require('./_tasks/CropTask.js');
const Input = require('Input');
let gui = require('Gui');


class imagej extends GuiExtension {

    constructor() {
        super();
        this.maxMemory = parseInt((os.totalmem() * 0.7) / 1000000);
        this.maxStackMemory = 515;
        this.memory = this.maxMemory;
        this.stackMemory = this.maxStackMemory;
        this.image = `${__dirname}${path.sep}_images${path.sep}imagej-logo.gif`;
        let platform = os.platform().replace('32', '');
        let arch = os.arch().replace('x', '');
        this.imagejcmnd = `./ImageJ-${platform}${arch}`;
        if (platform == 'darwin') {
            this.imagejcmnd = `./Contents/MacOS/ImageJ-macosx`;
        }
        if (isDev) {
            this.imagejpath = `${__dirname}${path.sep}_resources${path.sep}ImageJ${path.sep}`;
        } else {
            this.imagejpath = `${process.resourcesPath}${path.sep}ImageJ${path.sep}`;
        }
    }

    activate() {
        // this.addToggleButton({
        //     id: 'imageJToggleButton',
        //     buttonsContainer: gui.header.actionsContainer,
        //     text: "ImageJ",
        //     groupId: "imageJ",
        //     action: () => {
        //         this.pane.show();
        //     }
        // });
        this.pane = new ToggleElement(document.createElement('DIV'));
        this.pane.element.className = 'pane';
        this.pane.show();
        this.element.appendChild(this.pane.element);
        super.activate();
        this.createMenu();


    }

    deactivate() {
        //  this.removeToggleButton('imageJToggleButton');
        gui.removeSubmenu(this.menu);
        this.element.removeChild(this.pane.element);
    }


    createMenu() {
        let menu = new Menu();
        menu.append(new MenuItem({
            label: 'Launch ImageJ',
            type: 'normal',
            click: () => {
                this.launchImageJ();
            }
        }));
        menu.append(new MenuItem({
            label: 'Config ImageJ',
            type: 'normal',
            click: () => {
                this.configImageJ();
            }
        }));

        let mapToolsSubMenu = new Menu();
        mapToolsSubMenu.append(new MenuItem({
            label: "Create map from image",
            type: "normal",
            click: () => {
                this.createMap(true, false);
            }
        }));

        mapToolsSubMenu.append(new MenuItem({
            label: "Create map from folder",
            type: "normal",
            click: () => {
                this.createMap(true, true);
            }
        }));

        mapToolsSubMenu.append(new MenuItem({
            label: "Create layer from image",
            type: "normal",
            click: () => {
                this.createMap(false, false);
            }
        }));

        mapToolsSubMenu.append(new MenuItem({
            label: "Create layer from folder",
            type: "normal",
            click: () => {
                this.createMap(false, true);
            }
        }));

        menu.append(new MenuItem({
            label: "Map Tools",
            submenu: mapToolsSubMenu
        }));

        let objDetectionSubmenu = new Menu();
        objDetectionSubmenu.append(new MenuItem({
            label: "Single image",
            type: "normal",
            click: () => {
                this.objectDetection(Util.Layers.Mode.SINGLE_IMAGE);
            }
        }));

        objDetectionSubmenu.append(new MenuItem({
            label: "Folder",
            type: "normal",
            click: () => {
                this.objectDetection(Util.Layers.Mode.FOLDER);
            }
        }));

        objDetectionSubmenu.append(new MenuItem({
            label: "Image list",
            type: "normal",
            click: () => {
                this.objectDetection(Util.Layers.Mode.IMAGE_LIST);
            }
        }));

        menu.append(new MenuItem({
            label: "Object detection",
            submenu: objDetectionSubmenu
        }));

        let holesDetectionSubmenu = new Menu();
        holesDetectionSubmenu.append(new MenuItem({
            label: "Single image",
            type: "normal",
            click: () => {
                this.holesDetection(Util.Layers.Mode.SINGLE_IMAGE);
            }
        }));

        holesDetectionSubmenu.append(new MenuItem({
            label: "Folder",
            type: "normal",
            click: () => {
                this.holesDetection(Util.Layers.Mode.FOLDER);
            }
        }));

        holesDetectionSubmenu.append(new MenuItem({
            label: "Image list",
            type: "normal",
            click: () => {
                this.holesDetection(Util.Layers.Mode.IMAGE_LIST);
            }
        }));

        menu.append(new MenuItem({
            label: "Holes detection",
            submenu: holesDetectionSubmenu
        }));


        let toolsMenu = new Menu();

        toolsMenu.append(new MenuItem({
            label: 'Crop image',
            type: 'normal',
            click: () => {
                this.cropImage();
            }
        }));

        menu.append(new MenuItem({
            label: "Tools",
            submenu: toolsMenu
        }));

        this.menu = new MenuItem({
            label: "Imagej",
            type: "submenu",
            submenu: menu
        });
        gui.addSubMenu(this.menu);
    }

    show() {
        super.show();
    }

    launchImageJ() {
        let childProcess = spawn('java', [`-Xmx${this.memory}m`, `-Xss${this.stackMemory}m`, `-jar`, `ij.jar`], {
            cwd: this.imagejpath,
            stdio: 'ignore'
        });

        Util.notifyOS('ImageJ launched.');

        childProcess.on('error', (error) => {
            Util.notifyOS(`ImageJ exec error: ${error}`);
        });

        childProcess.on('close', (code) => {
            gui.notify('ImageJ closed');
        });
    }


    run(macro, args) {
        return spawn('java', [`-Xmx${this.memory}m`, `-Xss${this.stackMemory}m`, `-jar`, `ij.jar`, `-batchpath`, `Atlas${path.sep}${macro}.ijm`, `${args}`], {
            cwd: this.imagejpath
            //stdio: 'ignore'
        });
    }

    /*runHeadless(cmnd, arg, cl) {
        exec(`${this.imagejcmnd} --ij2 --run plugins/obj_detection/obj_detection_folder.ijm  '${arg}'`, {
            cwd: this.imagejpath
        }, (error, stdout, stderr) => {
            console.log(stderr);
            if (error) {
                Util.notifyOS(`imageJ exec error: ${error}`);
                console.log(error);
                return;
            }
            if (typeof cl === 'function') {
                cl(stdout);
            }
            gui.notify(`ImageJ macro finish and closed`);
        });
        gui.notify(`ImageJ macro from ${cmnd} launched`);
    }*/

    createMap(isMap, isFolder) {
        let title = 'Choose image';
        if (isFolder) {
            title += ' in the left-upper corner';
        }

        dialog.showOpenDialog({
            title: title,
            type: 'normal'
        }, (filepaths) => {
            if (filepaths) {
                let details;
                if (isMap) {
                    details = `Map: ${path.basename(filepaths[0])}`;
                } else {
                    details = `Layer: ${path.basename(filepaths[0])}`;
                }
                let mapCreatorTask = new MapCreatorTask(details, isMap, isFolder);
                TaskManager.addTask(mapCreatorTask);
                mapCreatorTask.run(filepaths[0]);
            }
        });
    }

    objectDetection(mode) {
        let props = ['openFile'];
        if (mode === Util.Layers.Mode.FOLDER) {
            props = ['openDirectory'];
        }
        dialog.showOpenDialog({
            title: 'Image object detection',
            type: 'normal',
            properties: props
        }, (filepaths) => {
            if (filepaths) {
                let details;
                if (mode === Util.Layers.Mode.FOLDER) {
                    details = `Folder: ${path.basename(filepaths[0])}`;
                } else {
                    if (path.extname(filepaths[0]) === "txt") {
                        details = `File: ${path.basename(filepaths[0])}`;
                    } else {
                        details = `Image: ${path.basename(filepaths[0])}`;
                    }
                }
                let objectDetectionTask = new ObjectDetectionTask(details, mode);
                TaskManager.addTask(objectDetectionTask);
                objectDetectionTask.run(filepaths[0]);
            }
        });
    }

    holesDetection(mode) {
        let props = ['openFile'];
        if (mode === Util.Layers.Mode.FOLDER) {
            props = ['openDirectory'];
        }
        dialog.showOpenDialog({
            title: 'Holes detection',
            type: 'normal',
            properties: props
        }, (filepaths) => {
            if (filepaths) {
                let details;
                if (mode === Util.Layers.Mode.FOLDER) {
                    details = `Folder: ${path.basename(filepaths[0])}`;
                } else {
                    if (path.extname(filepaths[0]) === "txt") {
                        details = `File: ${path.basename(filepaths[0])}`;
                    } else {
                        details = `Image: ${path.basename(filepaths[0])}`;
                    }
                }
                let holesDetectionTask = new HolesDetectionTask(details, mode);
                TaskManager.addTask(holesDetectionTask);
                holesDetectionTask.run(filepaths[0]);
            }
        });
    }

    cropImage() {
        dialog.showOpenDialog({
                title: 'Crop Big Image',
                type: 'normal',
                properties: ['openFile']
            },
            (filepaths) => {
                if (filepaths) {
                    let details = `Image: ${path.basename(filepaths[0])}`;
                    let cropTask = new CropTask(details);
                    TaskManager.addTask(cropTask);
                    cropTask.run(filepaths[0]);
                }

            }
       );
}

configImageJ() {
    let conf = Util.clone({
        memory: this.memory,
        stackMemory: this.stackMemory
    });
    let modal = new Modal({
        title: `Configure ImageJ`,
        width: '600px',
        height: 'auto'
    });
    let body = document.createElement('DIV');
    body.className = 'flex-container';
    let div = document.createElement('DIV');
    body.appendChild(div);
    Input.input({
        parent: div,
        label: 'Memory (MB)',
        className: 'simple form-control',
        value: this.memory,
        type: 'number',
        min: 100,
        max: this.maxMemory,
        step: 1,
        placeholder: 'memory',
        onblur: (inp) => {
            conf.memory = parseInt(Math.min(inp.value, this.maxMemory));
            inp.value = conf.memory;
        }
    });
    Input.input({
        parent: div,
        label: 'Stack memory (MB)',
        className: 'simple form-control',
        value: this.stackMemory,
        type: 'number',
        min: 10,
        max: this.maxStackMemory,
        step: 1,
        placeholder: 'memory',
        onblur: (inp) => {
            conf.stackMemory = parseInt(Math.min(inp.value, this.maxStackMemory));
            inp.value = conf.stackMemory;
        }
    });
    let Bc = new ButtonsContainer(document.createElement('DIV'));
    Bc.addButton({
        id: 'closeeimagejconfig',
        text: 'Cancel',
        action: () => {
            modal.destroy();
        },
        className: 'btn-default'
    });
    Bc.addButton({
        id: 'saveeeiamgejconfig',
        text: 'Save',
        action: () => {
            this.memory = conf.memory;
            this.stackMemory = conf.stackMemory;
            modal.destroy();
        },
        className: 'btn-default'
    });
    let footer = document.createElement('DIV');
    footer.appendChild(Bc.element);
    modal.addBody(body);
    modal.addFooter(footer);
    modal.show();
}

}


module.exports = imagej;
