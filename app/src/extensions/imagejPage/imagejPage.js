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
const Input = require('Input');
const ButtonsContainer = require('ButtonsContainer');

class imagej extends GuiExtension {

    constructor(gui) {
        super(gui);
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
            label: "Create map",
            type: "normal",
            click: () => {
                this.createMap(true);
            }
        }))

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
        exec(`java -jar ij.jar`, {
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
        exec(`java -jar ij.jar -batchpath ${macro}.ijm ${args}`, {
            cwd: this.imagejpath
        }, (error, stdout, stderr) => {
            console.log(stderr);
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
    }

    runHeadless(cmnd, arg, cl) {
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
    }

    createMap(isMap) {
        dialog.showOpenDialog({
            title: 'Create map from image',
            type: 'normal'
        }, (filepaths) => {
            if (filepaths) {
                this.showParametersModal((modal, params) => {
                    let use = "";
                    if (params.use) {
                        use = "use ";
                    }
                    let create = "";
                    if (isMap) {
                        create = "create ";
                    }
                    let macro = "mapcreator";
                    if (params.merge) {
                        macro += "withmerge";
                    }

                    let args = `"${filepaths[0]}#map=${params.map} pixel=${params.pixel} maximum=${params.maximum} slice=${params.slice} ${use}${create}choose=${params.path}"`;
                    this.run(macro, args, (stdout) => {
                        modal.destroy();
                        MapIO.loadMap([`${params.path}${path.sep}${params.map}${path.sep}${params.map}.json`], (conf) => {
                            this.gui.extensionsManager.extensions.mapPage.addNewMap(conf);
                        });
                    });
                });
            }
        });
    }

    showParametersModal(next) {
        var modal = new Modal({
            title: "Map creator options",
            width: "500px",
            height: "auto"
        });

        let body = document.createElement("DIV");
        body.className = "padded";
        let grid = new Grid(7, 2);

        let txtMapName = Input.input({
            type: "text",
            id: "txtmapname",
            value: "map"
        });
        let lblMapName = document.createElement("LABEL");
        lblMapName.htmlFor = "txtmapname";
        lblMapName.innerHTML = "Map name: ";
        grid.addElement(lblMapName, 0, 0);
        grid.addElement(txtMapName, 0, 1);

        let txtPixelTiles = Input.input({
            type: "text",
            id: "txtpixeltiles",
            value: "256"
        });
        let lblPixelTiles = document.createElement("LABEL");
        lblPixelTiles.htmlFor = "txtpixeltiles";
        lblPixelTiles.innerHTML = "Pixel tiles dimension: ";
        grid.addElement(lblPixelTiles, 1, 0);
        grid.addElement(txtPixelTiles, 1, 1);

        let numMaximumZoom = Input.input({
            type: "number",
            id: "nummaximumzoom",
            value: "5",
            min: "0",
            max: "8"
        });
        let lblMaximumZoom = document.createElement("LABEL");
        lblMaximumZoom.htmlFor = "nummaximumzoom";
        lblMaximumZoom.innerHTML = "Maximum zoom: ";
        grid.addElement(lblMaximumZoom, 2, 0);
        grid.addElement(numMaximumZoom, 2, 1);

        let checkUseAllSlice = Input.input({
            type: "checkbox",
            id: "useallslice",
            onchange: (e) => {
                checkMergeAllSlices.disabled = checkUseAllSlice.checked;
                numUsedSlice.disabled = checkUseAllSlice.checked;
            }
        });
        let lblUseAllSlice = document.createElement("LABEL");
        lblUseAllSlice.htmlFor = "useallslice";
        lblUseAllSlice.innerHTML = "Use all slice: ";
        grid.addElement(lblUseAllSlice, 3, 0);
        grid.addElement(checkUseAllSlice, 3, 1);

        let checkMergeAllSlices = Input.input({
            type: "checkbox",
            id: "mergeallslices",
            onchange: (e) => {
                checkUseAllSlice.disabled = checkMergeAllSlices.checked;
                numUsedSlice.disabled = checkMergeAllSlices.checked;
            }
        });
        let lblMergeAllSlices = document.createElement("LABEL");
        lblMergeAllSlices.htmlFor = "mergeallslices";
        lblMergeAllSlices.innerHTML = "Merge all slices: ";
        grid.addElement(lblMergeAllSlices, 4, 0);
        grid.addElement(checkMergeAllSlices, 4, 1);

        let numUsedSlice = Input.input({
            type: "number",
            id: "numusedslice",
            value: "1",
            min: "1"
        });
        let lblUsedSlice = document.createElement("LABEL");
        lblUsedSlice.htmlFor = "numusedslice";
        lblUsedSlice.innerHTML = "Slice to be used: ";
        grid.addElement(lblUsedSlice, 5, 0);
        grid.addElement(numUsedSlice, 5, 1);

        let fldOutputFolder = new FolderSelector("fileoutputfolder");
        let lblOutputFolder = document.createElement("LABEL");
        lblOutputFolder.htmlFor = "fileoutputfolder";
        lblOutputFolder.innerHTML = "Output folder: ";
        grid.addElement(lblOutputFolder, 6, 0);
        grid.addElement(fldOutputFolder.element, 6, 1);

        body.appendChild(grid.element);

        let buttonsContainer = new ButtonsContainer(document.createElement("DIV"));
        buttonsContainer.addButton({
            id: "CreateMap00",
            text: "Create",
            action: () => {
                if (typeof next === 'function') {
                    if (fldOutputFolder.getFolderRoute()) {
                        let params = {
                            map: txtMapName.value || "[]",
                            pixel: txtPixelTiles.value || "[]",
                            maximum: numMaximumZoom.value || "[]",
                            slice: numUsedSlice.value || "[]",
                            use: checkUseAllSlice.checked,
                            merge: checkMergeAllSlices.checked,
                            path: fldOutputFolder.getFolderRoute()
                        }
                        next(modal, params);
                    } else {
                        dialog.showErrorBox("Can't create map", "You must choose an output folder.");
                    }
                }
            },
            className: "btn-default"
        });
        buttonsContainer.addButton({
            id: "CancelMap00",
            text: "Cancel",
            action: () => {
                modal.destroy();
            },
            className: "btn-default"
        });
        let footer = document.createElement('DIV');
        footer.appendChild(buttonsContainer.element);

        modal.addBody(body);
        modal.addFooter(footer);
        modal.show();
    }
}


module.exports = imagej;
