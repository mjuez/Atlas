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
    exec
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
const MapCreatorTask = require('MapCreatorTask');
const Input = require('Input');

class imagej extends GuiExtension {

    constructor(gui) {
        super(gui);
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
        //     buttonsContainer: this.gui.header.actionsContainer,
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
        this.gui.removeSubmenu(this.menu);
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

        menu.append(new MenuItem({
            label: "Create map",
            type: "normal",
            click: () => {
                this.createMap(true);
            }
        }));

        let objDetectionSubmenu = new Menu();
        objDetectionSubmenu.append(new MenuItem({
            label: "Single image",
            type: "normal",
            click: () => {
                this.objectDetection(false);
            }
        }));

        objDetectionSubmenu.append(new MenuItem({
            label: "Folder",
            type: "normal",
            click: () => {
                this.objectDetection(true);
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
                this.holesDetection(false);
            }
        }));

        holesDetectionSubmenu.append(new MenuItem({
            label: "Folder",
            type: "normal",
            click: () => {
                this.holesDetection(true);
            }
        }));

        menu.append(new MenuItem({
            label: "Holes detection",
            submenu: holesDetectionSubmenu
        }));

        this.menu = new MenuItem({
            label: "Imagej",
            type: "submenu",
            submenu: menu
        });
        this.gui.addSubMenu(this.menu);
    }

    show() {
        super.show();
    }

    launchImageJ() {
        exec(`java -Xmx${this.memory}m -Xss${this.stackMemory}m -jar ij.jar`, {
            cwd: this.imagejpath
        }, (error, stdout, stderr) => {
            if (error) {
                Util.notifyOS(`ImageJ exec error: ${error}`);
                return;
            }
            this.gui.notify('ImageJ closed');
        });
        Util.notifyOS('ImageJ launched;');
    }


    run(macro, args, next) {
        let childProcess = exec(`java -Xmx${this.memory}m -Xss${this.stackMemory}m -jar ij.jar -batchpath Atlas/${macro}.ijm ${args}`, {
            cwd: this.imagejpath
        }, (error, stdout, stderr) => {
            if (error) {
                Util.notifyOS(`imageJ exec error: ${error}`);
                console.log(error);
                return;
            }
            if (typeof next === 'function') {
                next(stdout);
            }
            this.gui.notify(`ImageJ macro finish and closed`);
        });
        this.gui.notify(`ImageJ macro from ${macro} launched`);

        return childProcess;
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
            this.gui.notify(`ImageJ macro finish and closed`);
        });
        this.gui.notify(`ImageJ macro from ${cmnd} launched`);
    }*/

    createMap(isMap) {
        dialog.showOpenDialog({
            title: 'Create map from image',
            type: 'normal'
        }, (filepaths) => {
            if (filepaths) {
                let details;
                if(isMap){
                    details = `Map: ${path.basename(filepaths[0])}`;
                }else{
                    details = `Layer: ${path.basename(filepaths[0])}`;
                }
                let mapCreatorTask = new MapCreatorTask(details, isMap, this.gui);
                mapCreatorTask.run(filepaths[0]);
            }
        });
    }

    objectDetection(isFolder) {
        let props = ['openFile'];
        if (isFolder) {
            props = ['openDirectory'];
        }
        dialog.showOpenDialog({
            title: 'Image object detection',
            type: 'normal',
            properties: props
        }, (filepaths) => {
            if (filepaths) {
                this.showObjectDetectionParamsModal((modal, params) => {
                    let macro = "ObjectDetector";
                    let args = `"${isFolder}#${filepaths[0]}#${params.rmin}#${params.rmax}#${params.by}#${params.thrMethod}#${params.min}#${params.max}#${params.fraction}#${params.toll}#${params.path}"`;
                    let layerType = `points`;
                    this.run(macro, args, (stdout) => {
                        if (!isFolder) {
                            Util.Layers.createJSONConfiguration(filepaths[0], params.path, layerType, (config) => {
                                fs.writeFile(`${params.path}${path.sep}points${path.sep}${config.name}.json`, JSON.stringify(config, null, 2), (err) => {
                                    if (err) {
                                        Util.notifyOS(`Can't save JSON configuration file! Error: ${err}`);
                                    }
                                    Util.notifyOS(`Object detection task finished.`);
                                    this.gui.notify(`Object detection task finished.`);
                                });
                            });
                        } else {
                            // TODO
                            Util.notifyOS(`Object detection task finished.`);
                            this.gui.notify(`Object detection task finished.`);
                        }
                    });
                    this.gui.notify(`Performing object detection...`);
                    modal.destroy();
                });
            }
        });
    }

    showObjectDetectionParamsModal(next) {
        var modal = new Modal({
            title: "Object detection options",
            height: "auto"
        });

        let body = document.createElement("DIV");
        let grid = new Grid(9, 2);

        let numRMin = Input.input({
            type: "number",
            id: "numrmin",
            value: "1",
            min: "1",
            max: "15"
        });
        let lblRMin = document.createElement("LABEL");
        lblRMin.htmlFor = "numrmin";
        lblRMin.innerHTML = "Minimum radius: ";
        grid.addElement(lblRMin, 0, 0);
        grid.addElement(numRMin, 0, 1);

        let numRMax = Input.input({
            type: "number",
            id: "numrmax",
            value: "5",
            min: "1",
            max: "15"
        });
        let lblRMax = document.createElement("LABEL");
        lblRMax.htmlFor = "numrmax";
        lblRMax.innerHTML = "Maximum radius: ";
        grid.addElement(lblRMax, 1, 0);
        grid.addElement(numRMax, 1, 1);

        let numBy = Input.input({
            type: "number",
            id: "numby",
            value: "1",
            min: "0"
        });
        let lblBy = document.createElement("LABEL");
        lblBy.htmlFor = "numby";
        lblBy.innerHTML = "By: ";
        grid.addElement(lblBy, 2, 0);
        grid.addElement(numBy, 2, 1);

        let selThrMethod = Input.selectInput({
            label: "Threshold method",
            choices: [
                "Default",
                "Huang",
                "Intermodes",
                "IsoData",
                "Li",
                "MaxEntropy",
                "Mean",
                "MinError(I)",
                "Minimum",
                "Moments",
                "Otsu",
                "Percentile",
                "RenyiEntropy",
                "Shambhag",
                "Triangle",
                "Yen"
            ],
            className: "simple form-control",
            value: "Moments"
        });
        let lblThrMethod = document.createElement("LABEL");
        lblThrMethod.htmlFor = "selthrmethod";
        lblThrMethod.innerHTML = "Threshold method: ";
        grid.addElement(lblThrMethod, 3, 0);
        grid.addElement(selThrMethod, 3, 1);

        let numMin = Input.input({
            type: "number",
            id: "nummin",
            value: "1",
            min: "0"
        });
        let lblMin = document.createElement("LABEL");
        lblMin.htmlFor = "nummin";
        lblMin.innerHTML = "Minimum: ";
        grid.addElement(lblMin, 4, 0);
        grid.addElement(numMin, 4, 1);

        let numMax = Input.input({
            type: "number",
            id: "nummax",
            value: "-1",
            min: "-1"
        });
        let lblMax = document.createElement("LABEL");
        lblMax.htmlFor = "nummax";
        lblMax.innerHTML = "Maximum: ";
        grid.addElement(lblMax, 5, 0);
        grid.addElement(numMax, 5, 1);

        let numFraction = Input.input({
            type: "number",
            id: "numfraction",
            value: "0.500",
            min: "0",
            max: "1",
            step: "0.001"
        });
        let lblFraction = document.createElement("LABEL");
        lblFraction.htmlFor = "numfraction";
        lblFraction.innerHTML = "Fraction: ";
        grid.addElement(lblFraction, 6, 0);
        grid.addElement(numFraction, 6, 1);

        let numToll = Input.input({
            type: "number",
            id: "numtoll",
            value: "0",
            min: "0"
        });
        let lblToll = document.createElement("LABEL");
        lblToll.htmlFor = "numtoll";
        lblToll.innerHTML = "Tolerance: ";
        grid.addElement(lblToll, 7, 0);
        grid.addElement(numToll, 7, 1);

        let fldOutputFolder = new FolderSelector("fileoutputfolder");
        let lblOutputFolder = document.createElement("LABEL");
        lblOutputFolder.htmlFor = "fileoutputfolder";
        lblOutputFolder.innerHTML = "Output folder: ";
        grid.addElement(lblOutputFolder, 8, 0);
        grid.addElement(fldOutputFolder.element, 8, 1);

        let buttonsContainer = new ButtonsContainer(document.createElement("DIV"));
        buttonsContainer.addButton({
            id: "CancelDetection00",
            text: "Cancel",
            action: () => {
                modal.destroy();
            },
            className: "btn-default"
        });
        buttonsContainer.addButton({
            id: "OkDetection00",
            text: "Ok",
            action: () => {
                if (typeof next === 'function') {
                    if (fldOutputFolder.getFolderRoute()) {
                        let params = {
                            rmin: numRMin.value || "[]",
                            rmax: numRMax.value || "[]",
                            by: numBy.value || "[]",
                            thrMethod: selThrMethod.value,
                            min: numMin.value || "[]",
                            max: numMax.value || "[]",
                            fraction: numFraction.value || "[]",
                            toll: numToll.value || "[]",
                            path: fldOutputFolder.getFolderRoute()
                        }
                        next(modal, params);
                    } else {
                        dialog.showErrorBox("Can't detect objects", "You must choose an output folder where results will be saved.");
                    }
                }
            },
            className: "btn-default"
        });
        let footer = document.createElement('DIV');
        footer.appendChild(buttonsContainer.element);

        modal.addBody(grid.element);
        modal.addFooter(footer);
        modal.show();
    }

    holesDetection(isFolder) {
        let props = ['openFile'];
        if (isFolder) {
            props = ['openDirectory'];
        }
        dialog.showOpenDialog({
            title: 'Holes detection',
            type: 'normal',
            properties: props
        }, (filepaths) => {
            if (filepaths) {
                this.showHolesDetectionParamsModal((modal, params) => {
                    let macro = "HolesDetector";
                    let args = `"${isFolder}#${filepaths[0]}#${params.radius}#${params.threshold}#${params.path}"`;
                    let layerType = `pixels`;
                    this.run(macro, args, (stdout) => {
                        if (!isFolder) {
                            Util.Layers.createJSONConfiguration(filepaths[0], params.path, layerType, (config) => {
                                fs.writeFile(`${params.path}${path.sep}holes_pixels${path.sep}${config.name}.json`, JSON.stringify(config, null, 2), (err) => {
                                    if (err) {
                                        Util.notifyOS(`Can't save JSON configuration file! Error: ${err}`);
                                    }
                                    Util.notifyOS(`Object detection task finished.`);
                                    this.gui.notify(`Object detection task finished.`);
                                });
                            });
                        } else {
                            // TODO
                            Util.notifyOS(`Holes detection task finished.`);
                            this.gui.notify(`Holes detection task finished.`);
                        }
                    });
                    this.gui.notify(`Performing holes detection...`);
                    modal.destroy();
                });
            }
        });
    }

    showHolesDetectionParamsModal(next) {
        var modal = new Modal({
            title: "Object detection options",
            height: "auto"
        });

        let body = document.createElement("DIV");
        let grid = new Grid(3, 2);

        let numRadius = Input.input({
            type: "number",
            id: "numradius",
            value: "10",
            min: "0"
        });
        let lblRadius = document.createElement("LABEL");
        lblRadius.htmlFor = "numradius";
        lblRadius.innerHTML = "Radius of median filter: ";
        grid.addElement(lblRadius, 0, 0);
        grid.addElement(numRadius, 0, 1);

        let numThreshold = Input.input({
            type: "number",
            id: "numthreshold",
            value: "250",
            min: "0"
        });
        let lblThreshold = document.createElement("LABEL");
        lblThreshold.htmlFor = "numthreshold";
        lblThreshold.innerHTML = "Threshold: ";
        grid.addElement(lblThreshold, 1, 0);
        grid.addElement(numThreshold, 1, 1);

        let fldOutputFolder = new FolderSelector("fileoutputfolder");
        let lblOutputFolder = document.createElement("LABEL");
        lblOutputFolder.htmlFor = "fileoutputfolder";
        lblOutputFolder.innerHTML = "Output folder: ";
        grid.addElement(lblOutputFolder, 2, 0);
        grid.addElement(fldOutputFolder.element, 2, 1);

        let buttonsContainer = new ButtonsContainer(document.createElement("DIV"));
        buttonsContainer.addButton({
            id: "CancelDetection00",
            text: "Cancel",
            action: () => {
                modal.destroy();
            },
            className: "btn-default"
        });
        buttonsContainer.addButton({
            id: "OkDetection00",
            text: "Ok",
            action: () => {
                if (typeof next === 'function') {
                    if (fldOutputFolder.getFolderRoute()) {
                        let params = {
                            radius: numRadius.value || "[]",
                            threshold: numThreshold.value || "[]",
                            path: fldOutputFolder.getFolderRoute()
                        }
                        next(modal, params);
                    } else {
                        dialog.showErrorBox("Can't detect holes", "You must choose an output folder where results will be saved.");
                    }
                }
            },
            className: "btn-default"
        });
        let footer = document.createElement('DIV');
        footer.appendChild(buttonsContainer.element);

        modal.addBody(grid.element);
        modal.addFooter(footer);
        modal.show();
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
