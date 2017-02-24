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
const Input = require('Input');
let gui = require('Gui');


class bioFormats extends GuiExtension {

    constructor() {
        super();
        this.maxMemory = parseInt((os.totalmem() * 0.7) / 1000000);
        this.maxStackMemory = 515;
        this.memory = this.maxMemory;
        this.stackMemory = this.maxStackMemory;
        this.arch = os.arch().replace('x', '');

        if (isDev) {
            this.path = path.join(__dirname,'_resources','BioFormats','bftools');
        } else {
            this.path = path.join(process.resourcesPath,'BioFormats','bftools');
        }
    }

    activate() {
        super.activate();
        this.createMenu();
    }

    deactivate() {
        gui.removeSubmenu(this.menu);
    }


    createMenu() {
        let menu = new Menu();
        gui.addSubMenu(this.menu);
    }


    run(cmnd, args) {
        return spawn('cmnd', [`${args}`], {
            cwd: this.path
            //stdio: 'ignore'
        });
    }


}


module.exports = bioFormats;
