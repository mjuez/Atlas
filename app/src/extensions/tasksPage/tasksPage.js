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

const icon = "fa fa-bars";
const toggleButtonId = 'tasksPageToggleButton';

class tasksPage extends GuiExtension {

    constructor(gui) {
        super(gui);
        this.icon = icon + " fa-2x";
    }

    activate() {
        super.activate();

        this.addToggleButton({
            id: toggleButtonId,
            buttonsContainer: this.gui.header.actionsContainer,
            className: 'btn btn-default pull-right',
            icon: icon
          });
        this.addPane();
        this.element.appendChild(this.pane.element);
        taskManager.addEventListener("change", () => {
            this.fillSections();
        });
    }

    deactivate() {
        this.element.removeChild(this.pane.element);
        this.removeToggleButton(toggleButtonId);
        taskManager.removeEventListener("change", () => {
            this.fillSections();
        });
        super.deactivate();
    }

    show() {
        super.show();
        this.fillSections();
    }

    addPane() {
        this.pane = new ToggleElement(document.createElement('DIV'));
        this.pane.element.className = 'pane';
        this.addSections();
        this.pane.show();
    }

    addSections() {
        let sections = document.createElement('DIV');
        sections.className = "padded";
        let runningTasksHeader = document.createElement('H5');
        runningTasksHeader.innerHTML = "RUNNING TASKS";
        this.runningTasksContainer = document.createElement('DIV');

        let completedTasksHeader = document.createElement('H5');
        completedTasksHeader.innerHTML = "COMPLETED TASKS";
        this.completedTasksContainer = document.createElement('DIV');

        sections.appendChild(runningTasksHeader);
        sections.appendChild(this.runningTasksContainer);

        sections.appendChild(completedTasksHeader);
        sections.appendChild(this.completedTasksContainer);
        this.pane.element.appendChild(sections);
    }

    fillSections() {
        this.cleanSections();
        Object.keys(taskManager.tasks).map((key) => {
            let task = taskManager.tasks[key];
            if (task.completed) {
                this.completedTasksContainer.appendChild(task.DOMElement);
            } else {
                this.runningTasksContainer.appendChild(task.DOMElement);
                task.addEventListener("complete", () => {
                    task.showActions();
                    this.runningTasksContainer.removeChild(task.DOMElement);
                    this.completedTasksContainer.appendChild(task.DOMElement);
                });
            }
        });
    }

    cleanSections() {
        this.clean(this.runningTasksContainer);
        this.clean(this.completedTasksContainer);
    }

    clean(element) {
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }
}

module.exports = tasksPage;
