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

const icon = "fa fa-area-chart";
const toggleButtonId = 'regionStatsPageToggleButton';

let gui = require('Gui');


class regionStatsPage extends GuiExtension {

    constructor() {
        super();
        this.icon = icon + " fa-2x";
    }

    activate() {
        super.activate();

        this.addToggleButton({
            id: toggleButtonId,
            buttonsContainer: gui.header.actionsContainer,
            icon: icon,
            groupId: "mapPage"
        });

        this.addSidebar();
        this.addPane();
        this.element.appendChild(this.pane.element);
    }

    deactivate() {
        this.sidebar.remove();
        this.element.removeChild(this.pane.element);
        this.removeToggleButton(toggleButtonId);
        super.deactivate();
    }

    show() {
        super.show();
        this.cleanPane();
        this.sidebar.list.clean();
        //this.sidebar.markers.clean();
        this.loadWorkspaceData();
        this.cleanPane();
        this.showRegionsStats(gui.extensionsManager.extensions.mapPage.mapManager._configuration);
        this.sidebar.list.activeJustOne(gui.extensionsManager.extensions.mapPage.mapManager._configuration.id);
    }

    addSidebar() {
        this.sidebar = new Sidebar(this.element);
        this.sidebar.addList();
        this.sidebar.list.addSearch({
            placeholder: "Search maps"
        });
        this.sidebar.show();
    }

    addPane() {
        this.pane = new ToggleElement(document.createElement('DIV'));
        this.pane.element.className = 'pane';
        this.pane.show();
    }

    loadWorkspaceData() {
        if (gui.workspace.spaces.mapPage) {
            var maps = gui.workspace.spaces.mapPage;
            Object.keys(maps).map((key) => {
                let map = maps[key];
                this.addMapToSidebar(map);
            });
        }
    }

    addMapToSidebar(map) {
        this.sidebar.addItem({
            id: `${map.id}`,
            title: map.name,
            key: map.authors,
            toggle: {justOne:true}, //just one item is activable at the same time
            onclick: {
                active: () => {
                  gui.extensionsManager.extensions.mapPage.switchMap(map);
                  this.cleanPane(); // clean the pane to avoid more than one table to be displayed
                  this.showRegionsStats(map);
                },
                deactive: () => {
                    this.cleanPane();
                }
            }
        });
    }

    showRegionsStats(map) {
        let polygons = gui.extensionsManager.extensions.mapPage.mapManager.getLayers('polygons');
        if (polygons.length > 0) {
            var table = new Table();
            Object.keys(polygons).map((key) => {
                let pol = polygons[key]._configuration;
                if (pol.stats) {
                    let row = this.createRow(pol.stats, pol.name);
                    table.addRow(row);
                }
            });
            if (table.tbody.hasChildNodes()) {
                let exportContainer = document.createElement('DIV');
                exportContainer.className = "padded";
                let exportButton = document.createElement('BUTTON');
                exportButton.innerHTML = "Export statistics to CSV";
                exportButton.className = "btn btn-default";
                exportButton.onclick = function() {
                    return table.exportToCSV("Export regions statistics");
                };
                exportContainer.appendChild(exportButton);
                this.pane.element.appendChild(exportContainer);
                this.pane.element.appendChild(table.element);
            }
        }

        if (!this.pane.element.hasChildNodes()) {
            let noStats = document.createElement('DIV');
            noStats.className = "padded";
            noStats.innerHTML = "Selected map has no regions statistics.";
            this.pane.element.appendChild(noStats);
        }
    }

    createRow(stats, regionName) {
        let row = {
            "region": {
                col_name: "region",
                col_value: regionName
            }
        }
        Object.keys(stats).map((key) => {
            row[key] = {
                col_name: key,
                col_value: stats[key]
            };
        });

        return row;
    }

    cleanPane() {
        while (this.pane.element.firstChild) {
            this.pane.element.removeChild(this.pane.element.firstChild);
        }
    }
}

module.exports = regionStatsPage;
