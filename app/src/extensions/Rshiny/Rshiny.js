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

const {
    spawn,
    ChildProcess
} = require('child_process');
const SplitPane = require('SplitPane');
const Util = require('Util');
const TaskManager = require('TaskManager');
const Task = require('Task');
const ButtonsContainer = require('ButtonsContainer');
const Input = require('Input');
const TreeList = require('TreeList').TreeList;
const GuiExtension = require('GuiExtension');
const path = require('path');
const FileSelector = require('FileSelector');
const FolderSelector = require('FolderSelector');
const Grid = require('Grid');
const ToggleElement = require('ToggleElement');
const {
    dialog,
    Menu,
    MenuItem
} = require('electron').remote;
const Modal = require('Modal');
let gui = require('Gui');





class Rshiny extends GuiExtension {

    constructor() {
        super();
        this.image = path.join(__dirname, "_images", "icon.png");
    }


    activate() {
        this.addMenu();
        super.activate();
        this.webview = new ToggleElement(document.createElement('webview'));
        this.webview.element.classList.add('padded');
        this.webview.element.autosize = 'on';
        this.webview.element.style.width = '100%';
        this.webview.element.style.height = '100%';
        this.appendChild(this.webview);
    }

    deactivate() {
        Util.empty(this.element, this.element.firstChild);
        gui.removeSubmenu(this.menu);
        super.deactivate();

    }

    addMenu() {
        let menu = new Menu();
        menu.append(new MenuItem({
            label: "Open shiny app",
            click: () => {
                this.openShinyApp();
            }
        }));
        this.menu = new MenuItem({
            label: "Rshiny",
            type: "submenu",
            submenu: menu
        });
        gui.addSubMenu(this.menu);
    }


    runScript(path) {
        if (this.proc instanceof ChildProcess) this.proc.kill;
        this.childProcess = spawn('R', ['-q','--slave','-f', path]);
        this.childProcess.stdout.setEncoding('utf8');
        window.addEventListener('beforeunload', (e) => {
                this.childProcess.kill();
        });
    }

    openShinyApp() {
        dialog.showOpenDialog({
            title: 'Choose a R script',
            filters: [{
                name: 'R script',
                extensions: ['r', 'R']
            }]
        }, (filenames) => {
            if (filenames) {
                if (filenames.length > 0) {
                    this.runScript(filenames[0]);
                    this.childProcess.stdout.on('data', (data) => {
                        this.webview.element.src = `http://${data}/`;
                        this.webview.show();
                        this.show();
                    });
                }
            }
        });

    }



}

module.exports = Rshiny;
