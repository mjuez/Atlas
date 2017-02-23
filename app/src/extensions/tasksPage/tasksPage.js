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

"use strict";

const Workspace = require('Workspace');
const Sidebar = require('Sidebar');
const GuiExtension = require('GuiExtension');
const ToggleElement = require('ToggleElement');
const Table = require('Table');
const taskManager = require('TaskManager');
const Task = require('Task');


const icon = "fa fa-tasks";
const toggleButtonId = 'tasksPageToggleButton';

let gui = require('Gui');


class tasksPage extends GuiExtension {

    constructor() {
        super();
        this.icon = icon + " fa-2x";
    }

    activate() {
        super.activate();

        this.addToggleButton({
            id: toggleButtonId,
            buttonsContainer: gui.header.actionsContainer,
            className: 'btn btn-default pull-right',
            icon: icon
        });

        this.toggleButton = this.buttonsContainer.buttons[`${toggleButtonId}`];
        this.notifBadge = document.createElement("I");
        this.notifBadge.className = "fa fa-circle notif-off";
        this.toggleButton.appendChild(this.notifBadge);

        this.addPane();
        this.element.appendChild(this.pane.element);

        this.taskManagerChangeListener = (...args) => {
            if (args.length === 1) {
                let taskId = args[0];
                let task = taskManager.tasks[taskId].task;
                let domElement = taskManager.tasks[taskId].domElement.element;

                if (task.status === Task.Status.RUNNING || task.status === Task.Status.CREATED) {
                    if (!this.runningTasksContainer.contains(domElement)) {
                        this.runningTasksContainer.insertBefore(domElement, this.runningTasksContainer.firstChild);
                    }
                } else {
                    if (this.runningTasksContainer.contains(domElement)) {
                        this.runningTasksContainer.removeChild(domElement);
                    }
                    if (!this.finishedTasksContainer.contains(domElement)) {
                        this.finishedTasksContainer.insertBefore(domElement, this.finishedTasksContainer.firstChild);
                        this._updateBadge();
                    }
                }
            }
        };

        this.taskRemovedListener = (...args) => {
            if (args.length === 1) {
                let domElement = args[0].element;
                if (this.finishedTasksContainer.contains(domElement)) {
                    this.finishedTasksContainer.removeChild(domElement);
                }
            }
        };
        taskManager.on("change", this.taskManagerChangeListener);
        taskManager.on("task.removed", this.taskRemovedListener);
    }

    deactivate() {
        this.element.removeChild(this.pane.element);
        this.removeToggleButton(toggleButtonId);
        taskManager.removeListener("change", this.taskManagerChangeListener);
        taskManager.removeListener("task.removed", this.taskRemovedListener);
        super.deactivate();
    }

    show(){
        super.show();
        this._updateBadge();
    }

    addPane() {
        this.pane = new ToggleElement(document.createElement('DIV'));
        this.pane.element.className = 'pane tasks-pane';
        this.addSections();
        this.pane.show();
    }

    addSections() {
        let leftContainer = document.createElement("DIV");
        leftContainer.className = "left-container";
        let rightContainer = document.createElement("DIV");
        rightContainer.className = "right-container";
        let runningTasksHeader = document.createElement("DIV");
        runningTasksHeader.className = "tasks-header";
        runningTasksHeader.innerHTML = "Running tasks";
        let finishedTasksHeader = document.createElement("DIV");
        finishedTasksHeader.className = "tasks-header";
        finishedTasksHeader.innerHTML = "Finished tasks";
        this.runningTasksContainer = document.createElement("DIV");
        this.runningTasksContainer.className = "running-tasks-container";
        this.finishedTasksContainer = document.createElement("DIV");
        this.finishedTasksContainer.className = "finished-tasks-container";
        leftContainer.appendChild(runningTasksHeader);
        leftContainer.appendChild(this.runningTasksContainer);
        rightContainer.appendChild(finishedTasksHeader);
        rightContainer.appendChild(this.finishedTasksContainer);
        this.pane.element.appendChild(leftContainer);
        this.pane.element.appendChild(rightContainer);
    }

    _isHidden() {
        return this.element.style.display === 'none';
    }

    _updateBadge() {
        if (this._isHidden()) {
            if (this.notifBadge.classList.contains("notif-off")) {
                this.notifBadge.classList.remove("notif-off");
                this.notifBadge.classList.add("notif-on");
            }
        }else{
            if (this.notifBadge.classList.contains("notif-on")) {
                this.notifBadge.classList.remove("notif-on");
                this.notifBadge.classList.add("notif-off");
            }
        }
    }
}

module.exports = tasksPage;
