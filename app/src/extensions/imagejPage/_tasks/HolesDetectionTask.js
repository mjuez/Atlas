/**
 * @author : Mario Juez (mario@mjuez.com)
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

'use strict';

const fs = require('fs');
const path = require('path');
const Task = require('Task');
const Util = require('Util');
const Modal = require('Modal');
const Input = require('Input');
const Grid = require('Grid');
const FolderSelector = require('FolderSelector');
const ButtonsContainer = require('ButtonsContainer');
const ChildProcess = require('child_process').ChildProcess;
const {
    dialog
} = require('electron').remote;

let gui = require('Gui');


class HolesDetectionTask extends Task {

    constructor(details, mode) {
        let name = "ImageJ Holes Detection";
        super(name, details);
        this.imageJExtension = gui.extensionsManager.extensions.imagej;
        this.macro = "HolesDetector";
        this.mode = mode;
        this.jsonFile = null;
        this.childProcess = null;

    }

    run(runPath) {
        super.run();
        this.showModal((modal, params) => {
            let args = `${this.mode}#${runPath}#${params.radius}#${params.threshold}#${params.path}`;
            let layerType = `pixels`;
            let tot = 0;
            this.childProcess = this.imageJExtension.run(this.macro, args);
            this.childProcess.stdout.setEncoding('utf8');
            this.childProcess.stdout.on('data', (data) => {
                let regex = /[0-9]+\/[0-9]+/g;
                if (regex.test(data)) {
                    let progress = data.split("/");
                    let percentage = (progress[0] * 100) / progress[1];
                    this.updateProgress(percentage);
                }
            });

            this.childProcess.stderr.on('data', (data) => {
                console.log('stderr: ' + data);
            });

            this.childProcess.on('close', (code) => {
                let promise = new Promise((resolve) => {
                    let notification;
                    if (code == 0) {
                        Util.Layers.createJSONConfiguration(runPath, params.path, this.mode, layerType, (config) => {
                            let jsonPath = `${params.path}${path.sep}holes_pixels${path.sep}${config.name}.json`;
                            fs.writeFile(jsonPath, JSON.stringify(config, null, 2), (err) => {
                                if (err) {
                                    notification = `Can't save JSON configuration file! Error: ${err}`;
                                } else {
                                    notification = `Holes detection task (${this.details}) completed`;
                                    this.jsonFile = jsonPath;
                                }
                                resolve(notification);
                            });
                        });
                        this.success();
                    } else if (code == 1) {
                        notification = `Holes detection task (${this.details}) failed.`;
                        this.fail("Problems with JVM...");
                    } else {
                        notification = `Holes detection task (${this.details}) cancelled`;
                        resolve(notification);
                        this.cancel();
                    }
                });

                promise.then((notification) => {
                    Util.notifyOS(notification);
                    gui.notify(notification);
                });
            });

            this.childProcess.on('error', (err) => {
                this.fail(err);
                Util.notifyOS(`Holes detection exec error: ${err}`);
            });

            gui.notify(`Holes detection task started.`);
            modal.destroy();
        });
    }

    success() {
        this.customAction["caption"] = "Add layer to a map in workspace";
        this.customAction["onclick"] = () => {
            Task.Utils.showMapSelector(this.jsonFile);
        };
        return super.success();
    }

    cancel() {
        if (super.cancel()) {
            if (this.childProcess instanceof ChildProcess) {
                this.childProcess.kill();
            }
            return true;
        }
        return false;
    }

    showModal(next) {
        var modal = new Modal({
            title: "Holes detection options",
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
                this.cancel();
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


}

module.exports = HolesDetectionTask;
