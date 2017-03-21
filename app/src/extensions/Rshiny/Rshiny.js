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

const parent = module.parent;
const {
    spawn,
    ChildProcess
} = require('child_process');
const SplitPane = parent.require('SplitPane');
const Util = parent.require('Util');
const TaskManager = parent.require('TaskManager');
const Task = parent.require('Task');
const ButtonsContainer = parent.require('ButtonsContainer');
const Input = parent.require('Input');
const TreeList = parent.require('TreeList').TreeList;
const GuiExtension = parent.require('GuiExtension');
const path = require('path');
const Grid = parent.require('Grid');
const ToggleElement = parent.require('ToggleElement');
const {
    dialog,
    Menu,
    MenuItem
} = parent.require('electron').remote;
const Modal = parent.require('Modal');
let gui = parent.require('Gui');





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
