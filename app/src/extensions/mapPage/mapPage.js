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

const sizeOf = require('image-size');
const SplitPane = require('SplitPane');
const RegionAnalyzer = require('./_modules/RegionAnalyzer.js');
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
const MapEditor = require('./_modules/MapEditor.js');
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

let taskManager = require('TaskManager');

let gui = require('Gui');


class mapPage extends GuiExtension {

    constructor() {
        super(); //always
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
            buttonsContainer: gui.header.actionsContainer,
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
        this.sidebar.element.ondragover = (ev) => {
            ev.dataTransfer.dropEffect = "none";
            for (let f of ev.dataTransfer.files) {
                let regx = /(\.((json)|(mapconfig)))$/i;
                if (regx.test(f.name)) {
                    ev.dataTransfer.dropEffect = "link";
                    ev.preventDefault();
                }
            }
        };
        this.sidebar.element.ondrop = (ev) => {
            ev.preventDefault();
            for (let f of ev.dataTransfer.files) {
                let regx = /(\.((json)|(mapconfig)))$/i;
                if (regx.test(f.name)) {
                    MapIO.loadMap(f.path, (conf) => {
                        this.addNewMap(conf);
                    });
                }
            }
        };

        this.sidebar.show();

        this.mapPane = new SplitPane(document.createElement('DIV'));

        this.mapPane.top.ondragover = (ev) => {
            ev.dataTransfer.dropEffect = "none";
            for (let f of ev.dataTransfer.files) {
                let regx = /(\.((json)|(layerconfig)|(jpg)|(gif)|(csv)|(jpg)|(png)|(tif)|(tiff)))$/i;
                if (regx.test(f.name)) {
                    ev.dataTransfer.dropEffect = "link";
                    ev.preventDefault();
                }
            }
        };
        this.mapPane.top.ondrop = (ev) => {
            ev.preventDefault();
            for (let f of ev.dataTransfer.files) {
                let regx = /(\.((json)|(layerconfig)|(jpg)|(gif)|(csv)|(jpg)|(png)|(tif)|(tiff)))$/i;
                if (regx.test(f.name)) {
                    this.addLayerFile(f.path);
                }
            }
        };
        this.mapPane.hide();
        this.appendChild(this.mapPane);

        let mapContainer = this.mapPane.top;
        mapContainer.id = 'map';

        let editContainer = this.mapPane.bottom;
        globalShortcut.register('CmdOrCtrl+Up', () => {
            this.mapManager.tUP();
        });

        globalShortcut.register('CmdOrCtrl+Down', () => {
            this.mapManager.tDOWN();
        });

        globalShortcut.register('F1', () => {
            this.mapManager.center();
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
        this.mapEditor = new MapEditor(this.mapManager);
        this.mapEditor.on('soft_change', () => {
            this.updateMap();
        });
        this.mapEditor.on('change', () => {
            this.updateMap();
            this.mapManager.reload(true);
        });
        this.mapEditor.on('hard_change', () => {
            this.updateMap(true);
        });
        this.regionAnalyzer = new RegionAnalyzer(this.mapManager, gui);
        this.listenMapManager();
        this.makeMenu();
        taskManager.on('progress', (prog)=>{
          gui.setProgress(prog);
        });

        gui.workspace.addSpace(this, this.maps, false); //without overwriting

        //saving to workspace and retriving loaded worspace
        if (gui.workspace instanceof Workspace) {
            gui.workspace.addSpace(this, this.maps);
            gui.workspace.on('load', () => {
                gui.notify('loading maps from workspace...');
                this.cleanMaps();
                let maps = gui.workspace.spaces.mapPage || {};
                let tot = Object.keys(maps).length;
                Object.keys(maps).map((id, i) => {
                    gui.footer.progressBar.setBar(100 * (i + 1) / tot);
                    this.addNewMap(MapIO.buildConfiguration(maps[id]));
                });
                gui.workspace.addSpace(this, this.maps, true); //overwriting
                gui.notify(`${tot} maps from workspace loaded`);
            });
        }

        //check if there is a mapPage space in the curretn workspace and retrive it
        if (gui.workspace.spaces.mapPage) {
            this.cleanMaps();
            let maps = gui.workspace.spaces.mapPage;
            Object.keys(maps).map((id) => {
                this.addNewMap(MapIO.buildConfiguration(maps[id]));
            });
            gui.workspace.addSpace(this, this.maps, true); //overwriting
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
            label: 'Add guide layer',
            click: () => {
                this.addLayer({
                    name: 'guide layer',
                    type: 'guideLayer',
                    size: 100,
                    tileSize: 10
                });
                this.switchMap(this.mapManager._configuration);
            }
        }));
        layer.append(new MenuItem({
            label: 'Add tiles layer',
            click: () => {
                this.addLayer({
                    name: 'tiles layer',
                    type: 'tilesLayer',
                    tileSize: 256,
                    tilesUrlTemplate: ''
                });
                this.switchMap(this.mapManager._configuration);
            }
        }));
        region.append(new MenuItem({
            label: 'Delete selected',
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
                    this.regionAnalyzer.computeRegionStats(reg);
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
                    this.regionAnalyzer.computeRegionStats(reg);
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
                    this.show();
                });
            }
        }));
        mapMenu.append(new MenuItem({
            label: 'Crate map',
            type: 'normal',
            click: () => {
                this.createMap();
                this.show();
            }
        }));
        mapMenu.append(new MenuItem({
            label: 'Edit map',
            accelerator: 'CmdOrCtrl + L',
            click: () => {
              this.mapPane.show();
              this.devPane.hide();
              this.mapPane.toggleBottom();
              this.show();
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
                    gui.notify(`${c.name} map saved in ${p}`);
                }, (err) => {
                    gui.notify(err);
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
                this.mapPane.show();
                this.devPane.hide();
                this.show();
            }
        }));
        this.menu = new MenuItem({
            label: "Maps",
            type: "submenu",
            submenu: mapMenu
        });
        gui.addSubMenu(this.menu);
    }

    deactivate() { /// the extension has to take care of removing all the buttons and element appended
        this.sidebar.remove();
        this.sidebarRegions.remove();
        this.element.removeChild(this.mapPane.element);
        this.element.removeChild(this.devPane.element);
        gui.removeSubmenu(this.menu);
        this.removeToggleButton('mapPageToggleButton'); //this is compulsory to leave the interface clean
        super.deactivate(); //we will also call the super class deactivate method
    }


    cleanMaps() {
        this.mapManager.clean();
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
            this.updateMap();
        }
    }

    initRegionActions(configuration, force) {
        if (configuration === this.mapManager._configuration && !force) return;
        this.sidebarRegions.list.clean();
    }

    fillEditor() {
            let cont = this.mapPane.bottom;
            Util.empty(cont, cont.firstChild);
            this.mapEditor.editor(cont);
    }

    switchMap(configuration, force) {
        if (configuration) {
            this.selectedRegions.map((pol) => {
                pol.setStyle({
                    fillOpacity: 0.3
                });
            });
            this.selectedRegions = [];
            this.initRegionActions(configuration, force);
            this.showConfiguration(configuration);
            this.mapManager.setConfiguration(configuration, force);
            this.fillEditor();
            this.sidebarRegions.show();
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
        ctn.append(new MenuItem({
            label: 'Export map',
            type: 'normal',
            click: () => {
                MapIO.saveAs(this.maps[configuration.id], (c, p, e) => {
                    gui.notify(`${c.name} map saved in ${p}`);
                }, (err) => {
                    gui.notify(err);
                });
            }
        }));
        ctn.append(new MenuItem({
            label: 'Edit map',
            type: 'normal',
            click: () => {
              this.mapPane.show();
              this.devPane.hide();
              this.mapPane.toggleBottom();
            }
        }));
        ctn.append(new MenuItem({
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
                        if (configuration == this.mapManager._configuration) {
                            this.mapManager.clean();
                        }
                        this.sidebar.list.removeItem(`${configuration.id}`);
                        delete this.maps[configuration.id];
                    }
                });

            }
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
            key: `${configuration.name} ${configuration.date} ${configuration.authors}`,
            body: body,
            icon: ic,
            toggle: {
                justOne: true
            },
            onclick: {
                active: () => {
                    this.switchMap(this.maps[configuration.id]);
                },
                deactive: () => {
                    this.sidebarRegions.hide();
                }
            }
        });

        this.maps[configuration.id] = configuration;
        configuration.new = false;
        this.switchMap(configuration, true);
        this.sidebar.list.activeJustOne(configuration.id);
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
                        this.regionAnalyzer.computeRegionStats(layer);
                    } else {
                        this.selectedRegions.map((reg) => {
                            this.regionAnalyzer.computeRegionStats(reg);
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
            let c = document.createElement('STRONG');
            c.appendChild(inp);
            c.appendChild(inpC);
            c.oncontextmenu = (event) => {
                context.popup();
            }
            this.sidebarRegions.addItem({
                id: layerConfig.id,
                title: c,
                key: layerConfig.name,
                toggle: true,
                onclick: {
                    active: () => {
                        this.mapManager._map.setView(layer.getLatLngs()[0][0]);
                        this.selectedRegions.push(layer);
                        layer.setStyle({
                            fillOpacity: 0.8
                        });
                        gui.notify(`${layerConfig.name} selected, (${this.selectedRegions.length} tot)`);
                        //gui.notify(`${layerConfig.name} => ${Util.stringify(layerConfig.stats) || ' '} _`); //region stats in footbar
                    },
                    deactive: () => {
                        this.selectedRegions.splice(this.selectedRegions.indexOf(layer), 1);
                        gui.notify(`${layerConfig.name} deselected, (${this.selectedRegions.length} tot)`);
                        layer.setStyle({
                            fillOpacity: 0.3
                        });
                    }
                }
            });
        });

        this.mapManager.on('add:marker', (e) => {
            let mark = e.layer;
            mark.on('contextmenu', (e) => {

            });

        });
        this.mapManager.on('remove:polygon', (e) => {
            this.sidebarRegions.list.removeItem(e.layer._configuration.id);
        });
    }


    updateMap(hard) {
        let configuration = this.mapManager._configuration;
        if (typeof configuration.id === 'undefined') return;
        try {
            configuration = MapIO.buildConfiguration(configuration);
            this.initRegionActions(configuration);
        } catch (e) {
            // otherwise means that the mapManager is unable to load the map
            console.log(e);
            return;
        }
        this.sidebar.list.setKey(configuration.id, configuration.authors);
        this.sidebar.list.setTitle(configuration.id, configuration.name);
        this.maps[configuration.id] = configuration;
        if (hard) {
            this.switchMap(configuration, true);
            this.mapPane.show();
            this.devPane.hide();
        }
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
            if (!conf) return;
            let key = conf.name || conf.alias || path;
            conf.basePath = MapIO.basePath(conf, path);
            this.mapManager._configuration.layers[key] = MapIO.parseLayerConfig(conf);
            this.mapManager.addLayer(this.mapManager._configuration.layers[key], key);
        } else if (path.endsWith('.jpg') || path.endsWith('.JPG') || path.endsWith('.png') || path.endsWith('.gif')) {
            var dim = sizeOf(path);
            let siz = Math.max(dim.height, dim.width);
            this.addLayer({
                name: `tilesLayer from ${path}`,
                tilesUrlTemplate: `file://${path}`,
                basePath: '',
                source: 'local',
                original_size: siz,
                maxZoom: 8,
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
                gui.notify(`${path} added`);
                Util.notifyOS(`"${path} added"`);
            }
            gui.notify(`${path} started conversion`);
            converter.convertArray([path], MapIO.basePath(null, path));
        }
        this.showConfiguration(this.mapManager._configuration);
        //this.switchMap(this.mapManager._configuration);
    }


    addLayer(conf) {
        conf = MapIO.parseLayerConfig(conf);
        let key = conf.name || conf.alias || conf.id || conf.type;
        this.mapManager._configuration.layers[key] = conf;
        this.mapManager.addLayer(conf);
        this.updateMap(true);
    }



}


module.exports = mapPage;
