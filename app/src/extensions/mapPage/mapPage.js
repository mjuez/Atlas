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

const Modal = require('Modal');
const Workspace = require('Workspace');
const Sidebar = require('Sidebar');
const GuiExtension = require('GuiExtension');
const ListGroup = require('ListGroup');
const NavGroup = require('NavGroup');
const ButtonsContainer = require('ButtonsContainer');
const {
    TreeList,
    TreeListInput
} = require('TreeList');
const ToggleElement = require('ToggleElement');
const Util = require('Util');
const ConvertTiff = require('tiff-to-png');
const json2csv = require('json2csv');
const {
    fork,
    exec
} = require('child_process');
const fs = require('fs');
const mapManager = require('./_modules/MapManager.js');
const MapIO = require('./_modules/MapIO.js');
const MapEdit = require('./_modules/MapEdit.js');
const leaflet = require('leaflet');
const {
    ipcRenderer
} = require('electron');
const {
    dialog,
    Menu,
    MenuItem
} = require('electron').remote;

const {
    globalShortcut
} = require('electron').remote;
const {
    app
} = require('electron').remote;



function extractPolygonArray(polygon, scale) {
    if (!scale) {
        scale = 1;
    }
    //convert latlngs to a vector of coordinates
    var vs = polygon[0].map(function(ltlng) {
        return ([ltlng.lng * scale, -ltlng.lat * scale])
    });

    return vs;
}




class mapPage extends GuiExtension {

    constructor(gui) {
        super(gui); //always
        this.icon = 'fa fa-map fa-2x';
        this.selectedRegions = [];
        this.maps = {};
        this.indx = 0;
        this.options = {
            drawControls: true,
            layerControl: true
        };

    }

    activate() {
            super.activate();
            this.addToggleButton({
                id: 'mapPageToggleButton',
                buttonsContainer: this.gui.header.actionsContainer,
                icon: "fa fa-map",
                groupId: "mapPage",
                action: () => {
                    this.mapPane.show();
                    this.devPane.hide();
                }
            });
            //add the sidebars
            this.sidebar = new Sidebar(this.element);
            this.sidebar.addList();
            this.sidebar.list.addSearch({
                placeholder: 'Search maps'
            });
            this.sidebar.addList('layerList');
            this.sidebar.layerList.hide();

            this.sidebar.show();

            this.mapPane = new ToggleElement(document.createElement('DIV'));
            this.mapPane.element.className = 'pane';
            this.mapPane.on('show', () => {
                ipcRenderer.send("mapViewTrick");
            });
            this.mapPane.hide();
            this.element.appendChild(this.mapPane.element);

            let mapContainer = document.createElement('DIV');
            mapContainer.style['z-index'] = 0;
            mapContainer.style.width = '100%';
            mapContainer.style.height = '100%';
            mapContainer.style.position = 'absolute';
            mapContainer.id = 'map';
            this.mapPane.element.appendChild(mapContainer);

            globalShortcut.unregisterAll();
            globalShortcut.register('CommandOrControl+Up', () => {
                this.mapManager.tUP();
            });

            globalShortcut.register('CommandOrControl+Down', () => {
                this.mapManager.tDOWN();
            });

            this.devPane = new ToggleElement(document.createElement('DIV'));
            this.devPane.element.className = 'pane padded';
            this.devPane.hide();
            this.element.appendChild(this.devPane.element);

            this.sidebarRegions = new Sidebar(this.element);
            this.sidebarRegions.addList();
            this.sidebarRegions.list.addSearch({
                placeholder: 'Search regions'
            });

            let arg = {
                minZoom: 0,
                zoomSnap: 1,
                zoomDelta: 1,
                crs: L.CRS.Simple,
                zoomControl: false
            }
            let map = L.map('map', arg);
            map.setView([-100, 100], 0);
            this.mapManager = L.mapManager(map);
            this.listenMapManager();
            this.makeMenu();

            this.gui.workspace.addSpace(this, this.maps, false); //without overwriting

            //saving to workspace and retriving loaded worspace
            if (this.gui.workspace instanceof Workspace) {
                this.gui.workspace.addSpace(this, this.maps);
                this.gui.workspace.on('load', () => {
                    this.gui.notify('loading maps from workspace...');
                    this.cleanMaps();
                    let maps = this.gui.workspace.spaces.mapPage || {};
                    let tot = Object.keys(maps).length;
                    Object.keys(maps).map((id, i) => {
                        this.gui.footer.progressBar.setBar(100 * (i + 1) / tot);
                        this.addNewMap(MapIO.buildConfiguration(maps[id]));
                    });
                    this.gui.workspace.addSpace(this, this.maps, true); //overwriting
                    this.gui.notify(`${tot} maps from workspace loaded`);
                });
            }

            //check if there is a mapPage space in the curretn workspace and retrive it
            if (this.gui.workspace.spaces.mapPage) {
                this.cleanMaps();
                let maps = this.gui.workspace.spaces.mapPage;
                Object.keys(maps).map((id) => {
                    this.addNewMap(MapIO.buildConfiguration(maps[id]));
                });
                this.gui.workspace.addSpace(this, this.maps, true); //overwriting
            }

        } //end activate



    makeMenu() {
        let mapMenu = new Menu();
        let region = new Menu();
        let layer = new Menu();
        layer.append(new MenuItem({
            label: 'Add layer from file',
            click: () => {
                this.openLayerFile();
            }
        }));
        layer.append(new MenuItem({
            label: 'Add tilesLayer',
            click: () => {

            }
        }));
        layer.append(new MenuItem({
            label: 'Edit layers',
            click: () => {
                MapEdit.editLayersModal(this.mapManager._configuration, (c) => {
                    this.updateMap(c);
                });
            }
        }));
        region.append(new MenuItem({
            label: 'Delete selected',
            accelerator: 'CmdOrCtrl + D',
            type: 'normal',
            click: () => {
                this.deleteRegionsCheck(this.selectedRegions);
                this.selectedRegions = [];
            }
        }));
        region.append(new MenuItem({
            label: 'Compute selected',
            type: 'normal',
            accelerator: 'CmdOrCtrl + Enter',
            click: () => {
                this.selectedRegions.map((reg) => {
                    this.computeRegionStats(reg);
                });
            }
        }));
        region.append(new MenuItem({
            label: 'Export selected',
            type: 'normal',
            accelerator: 'CmdOrCtrl + E',
            click: () => {
                this.exportsRegions(this.selectedRegions);
            }
        }));
        region.append(new MenuItem({
            label: '',
            type: 'separator'
        }));
        region.append(new MenuItem({
            label: 'Compute all',
            type: 'normal',
            accelerator: 'CmdOrCtrl + Shift + Enter',
            click: () => {
                this.mapManager.getLayers('polygon').map((reg) => {
                    this.computeRegionStats(reg);
                });
            }
        }));
        region.append(new MenuItem({
            label: 'Export all',
            type: 'normal',
            accelerator: 'CmdOrCtrl + Shift + E',
            click: () => {
                this.exportsRegions(this.mapManager.getLayers('polygon'));
            }
        }));
        mapMenu.append(new MenuItem({
            label: 'Load map',
            type: 'normal',
            click: () => {
                MapIO.loadMapfromFile((conf) => {
                    this.addNewMap(conf);
                });
            }
        }));
        mapMenu.append(new MenuItem({
            label: 'Crate map',
            type: 'normal',
            click: () => {
                this.createMap();
            }
        }));
        mapMenu.append(new MenuItem({
            label: 'Edit map',
            click: () => {
                MapEdit.previewModal(this.mapManager._configuration, (c) => {
                    this.updateMap(c);
                });
            }
        }));
        mapMenu.append(new MenuItem({
            label: '',
            type: 'separator'
        }));
        mapMenu.append(new MenuItem({
            label: 'Export current map',
            click: () => {
                MapIO.saveAs(this.mapManager._configuration, (c, p, e) => {
                    this.gui.notify(`${c.name} map saved in ${p}`);
                }, (err) => {
                    this.gui.notify(err);
                });
            }
        }));
        mapMenu.append(new MenuItem({
            label: '',
            type: 'separator'
        }));
        mapMenu.append(new MenuItem({
            label: 'Layers',
            submenu: layer,
            type: 'submenu'
        }));
        mapMenu.append(new MenuItem({
            label: 'Regions',
            submenu: region,
            type: 'submenu'
        }));
        mapMenu.append(new MenuItem({
            label: '',
            type: 'separator'
        }));
        mapMenu.append(new MenuItem({
            label: 'Show map',
            type: 'normal',
            accelerator: 'CmdOrCtrl + M',
            click: () => {
                this.show();
                this.mapPane.show();
                this.devPane.hide();
            }
        }));
        this.menu = new MenuItem({
            label: "Maps",
            type: "submenu",
            submenu: mapMenu
        });
        this.gui.addSubMenu(this.menu);
    }

    deactivate() { /// the extension has to take care of removing all the buttons and element appended
        this.sidebar.remove();
        this.sidebarRegions.remove();
        this.element.removeChild(this.mapPane.element);
        this.element.removeChild(this.devPane.element);
        this.gui.removeSubmenu(this.menu);
        this.removeToggleButton('mapPageToggleButton'); //this is compulsory to leave the interface clean
        super.deactivate(); //we will also call the super class deactivate method
    }


    cleanMaps() {
        if (Object.keys(this.maps)) {
            Object.keys(this.maps).map((id) => {
                let map = this.maps[id];
                if (!this.active) return;
                if (!map) return;
                this.sidebar.list.removeItem(`${map.id}`);
                this.maps = {};
                this.mapManager.setConfiguration({
                    type: 'map'
                });
            });
        }
        this.sidebar.list.clean();
        this.sidebar.layerList.clean();
        this.sidebarRegions.list.clean();
    }


    showConfiguration(configuration, show) {
        let pane = this.devPane.element;
        Util.empty(pane, pane.firstChild);
        let tree = new TreeListInput(pane, configuration);
        let raw = document.createElement('TEXTAREA');
        raw.className = 'form-control'
        raw.rows = '3'
        raw.readOnly = true;
        raw.innerHTML = JSON.stringify(configuration, null, 2);
        raw.style.display = 'none';
        let strong = document.createElement('STRONG');
        strong.className = 'toolbar-actions';
        strong.innerHTML = 'Raw configuration '
        let btnC = new ButtonsContainer(strong);
        btnC.addButton({
            id: 'editRaw',
            icon: 'fa fa-pencil',
            groupId: 'buttons',
            toggle: true,
            action: {
                active: () => {
                    raw.readOnly = false;
                    raw.style.display = 'block';
                    tree.hide();
                },
                deactive: () => {
                    raw.readOnly = true;
                    raw.style.display = 'none';
                    tree.show();
                }
            }
        });
        let cont = document.createElement('DIV');
        cont.className = 'form-group';
        let sub = new ButtonsContainer(document.createElement('DIV'));
        sub.element.className = 'form-actions';
        sub.addButton({
            text: 'Save',
            className: 'btn btn-form btn-default',
            action: () => {
                this.saveConfiguration(tree.getObject());
            }
        });
        sub.addButton({
            text: 'Cancel',
            className: 'btn btn-form btn-default',
            action: () => {
                this.devPane.hide();
                this.mapPane.show();
                Util.empty(pane, pane.firstChild);
            }
        });
        cont.appendChild(strong);
        cont.appendChild(raw);
        pane.appendChild(cont);
        pane.appendChild(sub.element);
        if (show) {
            this.mapPane.hide();
            this.devPane.show();
            this.show();
        }
    }


    saveConfiguration(configuration) {
        if (configuration.new) {
            this.addNewMap(configuration);
        } else {
            this.updateMap(configuration);
        }
    }

    initRegionActions(configuration, force) {
        if (configuration === this.mapManager._configuration && !force) return;
        this.sidebarRegions.list.clean();
    }

    switchMap(configuration, force) {
        if (configuration) {
            this.sidebar.list.deactiveAll();
            this.sidebar.list.applyAll((item) => {
                item.body.hide();
            });
            if ((configuration != this.mapManager._configuration) || force) {
                this.sidebar.layerList.clean();
            }

            this.sidebarRegions.list.applyAll((item) => {
                item.element.className = 'list-group-item';
            });
            this.selectedRegions.map((pol) => {
                pol.setStyle({
                    fillOpacity: 0.3
                });
            });
            this.selectedRegions = [];
            this.initRegionActions(configuration, force);
            this.showConfiguration(configuration);
            this.mapManager.setConfiguration(configuration, force);
            this.sidebar.list.items[`${configuration.id}`].element.getElementsByTagName('STRONG')[0].innerHTML = configuration.name; //set the correct name
            this.sidebar.list.activeOne(`${configuration.id}`);
            this.sidebarRegions.show();
            this.sidebar.layerList.hide();
        } else {
            this.switchMap(this.mapManager._configuration);
        }
    }


    addNewMap(configuration) {
        this.indx++;
        configuration.id = this.indx;
        this.initRegionActions(configuration);
        try {
            this.mapManager.setConfiguration(configuration);
        } catch (e) {
            // otherwise means that the mapManager is unable to load the map
            console.log(e);
            return;
        }
        let body = new ToggleElement(document.createElement('DIV'));

        let ic;
        switch (configuration.source) {
            case 'remote':
                ic = 'icon icon-network';
                break;
            case 'local':
                ic = '';
                break;
            case 'mixed':
                ic = '';
                break;
            default:
                ic = '';
        };


        let ctn = new Menu();
        let edit = new Menu();
        ctn.append(new MenuItem({
            label: 'Toggle Layers View',
            type: 'normal',
            click: () => {
                this.sidebar.layerList.toggle();
            }
        }));
        ctn.append(new MenuItem({
            type: 'separator'
        }));
        ctn.append(new MenuItem({
            label: 'Export map',
            type: 'normal',
            click: () => {
                MapIO.saveAs(this.maps[configuration.id], (c, p, e) => {
                    this.gui.notify(`${c.name} map saved in ${p}`);
                }, (err) => {
                    this.gui.notify(err);
                });
            }
        }));
        edit.append(new MenuItem({
            label: 'Edit map',
            type: 'normal',
            click: () => {
                MapEdit.previewModal(this.maps[configuration.id], (c) => {
                    this.updateMap(c);
                });
            }
        }));


        edit.append(new MenuItem({
            label: 'Edit layers',
            type: 'normal',
            click: () => {
                MapEdit.editLayersModal(this.maps[configuration.id], (c) => {
                    this.updateMap(c);
                });
            }
        }));
        edit.append(new MenuItem({
            label: 'Delete',
            type: 'normal',
            click: () => {
                dialog.showMessageBox({
                    title: 'Delete Map?',
                    type: 'warning',
                    buttons: ['No', "Yes"],
                    message: `Delete map ${this.maps[configuration.id].name}? (no undo available)`,
                    noLink: true
                }, (id) => {
                    if (id > 0) {
                        this.sidebar.list.removeItem(`${configuration.id}`);
                        delete this.maps[configuration.id];
                    }
                });

            }
        }));
        ctn.append(new MenuItem({
            label: 'Edit',
            type: 'submenu',
            submenu: edit
        }));
        ctn.append(new MenuItem({
            label: 'Dev view',
            type: 'normal',
            click: () => {
                dialog.showMessageBox({
                    title: 'show map configuration?',
                    type: 'warning',
                    buttons: ['No', "Yes"],
                    message: `The map configuration object should be modified only if you know what you are doing`,
                    detail: 'tips: you can go back to map view with CmdOrCtrl + M',
                    noLink: true
                }, (id) => {
                    if (id > 0) {
                        this.mapPane.hide();
                        this.devPane.show();
                    }
                });

            }
        }));

        let title = document.createElement('STRONG');
        title.innerHTML = configuration.name;
        title.oncontextmenu = () => {
            ctn.popup();
        }

        this.sidebar.addItem({
            id: `${configuration.id}`,
            title: title,
            body: body,
            icon: ic,
            toggle: true,
            onclick: {
                active: () => {
                    this.switchMap(this.maps[configuration.id]);
                    //this.sidebar.list.search.disabled=true;
                    //btnCont.show();
                },
                deactive: () => {
                    this.sidebarRegions.hide();
                    this.sidebar.layerList.hide();
                    //this.sidebar.list.search.disabled=false;
                    //btnCont.hide();
                }
            }
        });

        this.maps[configuration.id] = configuration;
        configuration.new = false;
        this.switchMap(configuration);
        this.mapPane.show();
        this.devPane.hide();
    }




    listenMapManager() {
        //when a polygon is added create region element in the sidebarRegions and relative actions,
        this.mapManager.on('add:polygon', (e) => {
            let layer = e.layer;
            let layerConfig = e.layer._configuration;

            layer.on('click', () => {
                if (!this.sidebarRegions.list.items[layerConfig.id].element.className.includes('active')) {
                    this.sidebarRegions.list.items[layerConfig.id].element.className = 'list-group-item active';
                    this.mapManager._map.setView(layer.getLatLngs()[0][0]);
                    this.selectedRegions.push(layer);
                    layer.setStyle({
                        fillOpacity: 0.8
                    });
                } else {
                    this.sidebarRegions.list.items[layerConfig.id].element.className = 'list-group-item';
                    this.selectedRegions.splice(this.selectedRegions.indexOf(layer), 1);
                    layer.setStyle({
                        fillOpacity: 0.3
                    });
                }
            });
            let inpC = document.createElement('INPUT');
            let inp = document.createElement('INPUT');
            inpC.type = 'color';
            inpC.style.display = 'none';

            inp.type = 'text';
            inp.className = 'list-input';
            inp.readOnly = true;
            inp.onchange = () => {
                layerConfig.name = inp.value;
                layer.setTooltipContent(inp.value);
                inp.readOnly = true;
            }
            inp.onblur = () => {
                inp.value = layerConfig.name;
                inp.readOnly = true;
            }
            inp.ondblclick = (event) => {
                event.stopPropagation();
                inp.readOnly = false;
            }
            inpC.onchange = () => {
                inpC.style.display = 'none';
                layer.setStyle({
                    fillColor: inpC.value,
                    color: inpC.value
                });
            }
            inpC.oninput = () => {
                layer.setStyle({
                    fillColor: inpC.value,
                    color: inpC.value
                });
            }

            let context = new Menu();
            context.append(new MenuItem({
                label: 'Delete',
                click: () => {
                    if (this.selectedRegions.length === 0) {
                        this.selectedRegions.push(layer);
                    }
                    this.deleteRegionsCheck(this.selectedRegions);
                    this.selectedRegions = [];
                }
            }));
            context.append(new MenuItem({
                label: 'Color',
                click: () => {
                    inpC.style.display = 'inline';
                    inpC.focus();
                    inpC.click();
                }
            }));
            context.append(new MenuItem({
                label: 'Compute',
                click: () => {
                    if (this.selectedRegions.length === 0) {
                        this.computeRegionStats(layer);
                    } else {
                        this.selectedRegions.map((reg) => {
                            this.computeRegionStats(reg);
                        });
                    }

                }
            }));
            context.append(new MenuItem({
                label: 'Export',
                click: () => {
                    if (this.selectedRegions.length === 0) {
                        this.exportsRegions([layer]);
                    } else {
                        this.exportsRegions(this.selectedRegions);
                    }
                }
            }));
            inp.placeholder = 'Region name';
            inp.value = layerConfig.name;
            inp.size = layerConfig.name.length + 1;
            let c = document.createElement('DIV');
            c.appendChild(inp);
            c.appendChild(inpC);
            c.oncontextmenu = (event) => {
                context.popup();
            }
            this.sidebarRegions.addItem({
                id: layerConfig.id,
                title: c,
                toggle: true,
                onclick: {
                    active: () => {
                        this.mapManager._map.setView(layer.getLatLngs()[0][0]);
                        this.selectedRegions.push(layer);
                        layer.setStyle({
                            fillOpacity: 0.8
                        });
                        this.gui.notify(`${layerConfig.name} => ${Util.stringify(layerConfig.stats) || ' '} _`);
                    },
                    deactive: () => {
                        this.selectedRegions.splice(this.selectedRegions.indexOf(layer), 1);
                        layer.setStyle({
                            fillOpacity: 0.3
                        });
                    }
                }
            });
        });

        this.mapManager.on('add:marker', (e) => {
            let mark = e.layer;
            mark.on('click',(e)=>{

            });

        });

        this.mapManager.on('add:tileslayer', (e) => {
            let layer = e.layer;
            let config = e.layerConfig;
            let body = document.createElement('DIV');
            let inp = document.createElement('INPUT');
            inp.type = 'range';
            inp.min = 0;
            inp.max = 1;
            inp.step = 0.05;
            inp.value = layer.options.opacity;
            inp.oninput = () => {
                layer.setOpacity(inp.value);
            }
            body.appendChild(inp);
            this.sidebar.layerList.addItem({
                title: config.name,
                body: body
            });
        });

        this.mapManager.on('add:imagelayer', (e) => {
            let layer = e.layer;
            let config = e.layerConfig;
            let body = document.createElement('DIV');
            let inp = document.createElement('INPUT');
            inp.type = 'range';
            inp.min = 0;
            inp.max = 1;
            inp.step = 0.05;
            inp.value = layer.options.opacity;
            inp.oninput = () => {
                layer.setOpacity(inp.value);
            }
            body.appendChild(inp);
            this.sidebar.layerList.addItem({
                title: config.name,
                body: body
            });
        });
        this.mapManager.on('remove:polygon', (e) => {
            this.sidebarRegions.list.removeItem(e.layer._configuration.id);
        });
    }


    updateMap(configuration) {
        if (typeof configuration.id === 'undefined') return;
        try {
            configuration = MapIO.buildConfiguration(configuration);
            this.initRegionActions(configuration);
        } catch (e) {
            // otherwise means that the mapManager is unable to load the map
            console.log(e);
            return;
        }
        this.maps[configuration.id] = configuration;
        this.switchMap(configuration, true);
        this.mapPane.show();
        this.devPane.hide();
    }


    computeRegionStats(polygon) {
        polygon._configuration.stats = polygon._configuration.stats || {};
        polygon._configuration.stats.area_px = this.mapManager.polygonArea(polygon.getLatLngs());
        polygon._configuration.stats.area_cal = polygon._configuration.stats.area_px * (this.mapManager._configuration.size_cal * this.mapManager._configuration.size_cal) / (this.mapManager.getSize() * this.mapManager.getSize());
        polygon._configuration.stats.volume_cal = polygon._configuration.stats.area_cal * this.mapManager._configuration.depth_cal;

        this.mapManager.getLayers('pointsLayer').map((point) => {
            this.computePolygonPoint(polygon, point, (m) => {
                polygon._configuration.stats[point.name] = m.N;
                polygon._configuration.stats[`area_cal density ${point.name}`] = m.N / polygon._configuration.stats.area_cal;
                polygon._configuration.stats[`volume_cal density ${point.name}`] = m.N / polygon._configuration.stats.volume_cal;
                this.gui.notify(`${polygon._configuration.name} computed with ${point.name}, ${m.N} internal points counted in ${m.time[0]}.${m.time[1].toString()} seconds`);
                Util.notifyOS(`${polygon._configuration.name}: ${m.N} internal points from  ${point.name}`);
            });
        });

        this.mapManager.getLayers('pixelsLayer').map((pixel) => {
            this.computePolygonPixels(polygon, pixel, (m) => {
                polygon._configuration.stats[`${pixel.name}_raw_sum`] = m.sum;
                this.gui.notify(`${polygon._configuration.name} computed with ${pixel.name}, ${m.sum} total summed in ${m.time[0]}.${m.time[1].toString()} seconds`);
                Util.notifyOS(`${polygon._configuration.name}: ${m.sum} internal pixels from  ${pixel.name}`);
            });


        });


    }

    computePolygonPoint(polygon, points, callback) {
        let scale = points.size / this.mapManager.getSize();
        let pol = extractPolygonArray(polygon.getLatLngs(), scale);
        let ch = fork(`${__dirname}/_modules/childCount.js`);
        ch.on('message', (m) => {
            switch (m.x) {
                case 'complete':
                    if (typeof callback === 'function') callback(m);
                    ch.kill();
                    break;
                case 'step':
                    this.gui.header.progressBar.setBar((m.prog / m.tot) * 100);
                    ipcRenderer.send('setProgress', {
                        value: (m.prog / m.tot)
                    });
                    this.gui.notify(`${(m.prog / m.tot)*100}%`);
                    break;
                case 'error':
                    this.gui.notify(m.error + "error");
                    ch.kill();
                    break;
                default:
                    null
            }
        });
        ch.send({
            job: 'points',
            polygon: pol,
            points: points
        });
    }


    computePolygonPixels(polygon, pixels, callback) {
        let scale = pixels.size / this.mapManager.getSize();
        let pol = extractPolygonArray(polygon.getLatLngs(), scale);
        let ch = fork(`${__dirname}/_modules/childCount.js`);
        ch.on('message', (m) => {
            switch (m.x) {
                case 'complete':
                    if (typeof callback === 'function') callback(m);
                    ch.kill();
                    break;
                case 'step':
                    this.gui.header.progressBar.setBar((m.prog / m.tot) * 100);
                    ipcRenderer.send('setProgress', {
                        value: (m.prog / m.tot)
                    });
                    this.gui.notify(`${(m.prog / m.tot)*100}%`);
                    break;
                case 'error':
                    this.gui.notify(m.error + "error");
                    ch.kill();
                    break;
                default:
                    null
            }
        });
        ch.send({
            job: 'pixels',
            polygon: pol,
            pixels: pixels
        });
    }


    deleteRegionsCheck(regions) {
        dialog.showMessageBox({
            title: 'Delete selected regions?',
            type: 'warning',
            buttons: ['No', "Yes"],
            message: `Delete the selected regions? (no undo available)`,
            detail: `Regions to be deleted: ${regions.map((reg)=> {return reg._configuration.name})}`,
            noLink: true
        }, (id) => {
            if (id > 0) {
                regions.map((reg) => {
                    this.mapManager.removePolygon(reg, true);
                });
                regions = [];
            }
        });
    }


    exportsRegions(regions) {
        dialog.showSaveDialog({
            title: 'Export regions statistics',
            type: 'normal',
            filters: [{
                name: 'CSV',
                extensions: ['csv']
            }]
        }, (filename) => {
            let pointName = this.mapManager.getLayers('pointsLayer').map((x) => {
                return (x.name)
            })
            let fields = ['name'];
            let cont = json2csv({
                data: regions.map((reg) => {
                    reg._configuration.stats.name = reg._configuration.name;
                    Object.keys(reg._configuration.stats).map((key) => {
                        console.log(key);
                        if (fields.indexOf(`${key}`) < 0) {
                            fields.push(`${key}`);
                        }
                    });
                    return (reg._configuration.stats);
                }),
                fields: fields
            });
            fs.writeFile(filename, cont);
        });
    }


    createMap() {
        MapIO.createMap((c) => {
            this.addNewMap(c);
        });
    }

    openLayerFile() {
        if (Object.keys(this.maps).length <= 0) return;
        dialog.showOpenDialog({
            title: 'Add a new layer',
            filters: [{
                name: 'Configuration',
                extensions: ['json', 'mapconfig']
            }, {
                name: 'Images',
                extensions: ['jpg', 'png', 'gif', 'tiff', 'tif']
            }, {
                name: 'CSV',
                extensions: ['csv']
            }],
            properties: ['openFile']
        }, (filenames) => {
            if (filenames.length === 0) return;
            fs.stat(filenames[0], (err, stats) => {
                if (err) return;
                if (stats.isFile()) {
                    dialog.showMessageBox({
                        title: 'Add Layer?',
                        type: 'warning',
                        buttons: ['No', "Yes"],
                        message: `Add layer from  ${filenames[0]} to map ${this.mapManager._configuration.name} ?`,
                        noLink: true
                    }, (id) => {
                        if (id > 0) {
                            this.addLayerFile(filenames[0]);
                        }
                    });
                }
            });
        });
    }

    addLayerFile(path, options) {
        options = options || {};
        if (path.endsWith('.json') || path.endsWith('.mapconfig')) {
            let conf = Util.readJSONsync(path);
            let key = conf.name || conf.alias || path;
            conf.basePath = MapIO.basePath(conf, path);
            this.mapManager._configuration.layers[key] = MapIO.parseLayerConfig(conf);
            this.mapManager.addLayer(this.mapManager._configuration.layers[key], key);
        } else if (path.endsWith('.jpg') || path.endsWith('.JPG') || path.endsWith('.png') || path.endsWith('.gif')) {
            const sizeOf = require('image-size');
            var dim = sizeOf(path);
            let siz = Math.max(dim.height, dim.width);
            this.addLayer({
                name: `tilesLayer from ${path}`,
                tilesUrlTemplate: `file://${path}`,
                basePath: '',
                source: 'local',
                original_size: siz,
                baseLayer: !this.mapManager._state.baseLayerOn,
                author: 'unknown',
                type: 'tilesLayer',
                opacity: 0.8,
                tileSize: [dim.width / siz * 256, dim.height / siz * 256],
                bounds: [
                    [-Math.floor(dim.height * 256 / siz), 0],
                    [0, Math.floor(dim.width * 256 / siz)]
                ],
                size: 256
            });


        } else if (path.endsWith('.csv')) {
            this.addLayer({
                name: path,
                alias: `pointsLayer from ${path}`,
                author: 'unknow',
                type: 'pointsLayer',
                tiles_format: 'csv',
                pointsUrlTemplate: path,
                tileSize: this.mapManager._configuration.size || 256,
                size: this.mapManager._configuration.size || 256,
                maxNativeZoom: 0,
                maxZoom: 8
            });


        } else if (path.endsWith('.tiff') || path.endsWith('.tif')) { //convert it to png and use it
            var converter = new ConvertTiff({
                prefix: 'slice'
            });

            converter.progress = (converted, total) => {
                const sizeOf = require('image-size');
                var dim = sizeOf(`${converted[0].target}\/slice1.png`);
                let siz = Math.max(dim.height, dim.width);
                this.addLayer({
                    type: `tilesLayer`,
                    tilesUrlTemplate: `${converted[0].target}\/slice{t}.png`,
                    customKeys: {
                        "t": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
                    },
                    name: path,
                    baseLayer: true,
                    alias: `tilesLayer from ${path}`,
                    author: 'unknow',
                    tileSize: [dim.width / siz * 256, dim.height / siz * 256],
                    maxNativeZoom: 0,
                    maxZoom: 8
                });
                this.gui.notify(`"${conf.name} added`);
                Util.notifyOS(`"${conf.name} added"`);
            }
            this.gui.notify(`${path} started conversion`);
            converter.convertArray([path], MapIO.basePath(null, path));
        }
        this.showConfiguration(this.mapManager._configuration);
        this.switchMap(this.mapManager._configuration);
    }

    addLayer(conf) {
        conf = MapIO.parseLayerConfig(conf);
        let key = conf.name || conf.alias || conf.id || conf.type;
        this.mapManager._configuration.layers[key] = conf;
        this.mapManager.addLayer(conf);
    }






}


module.exports = mapPage;
