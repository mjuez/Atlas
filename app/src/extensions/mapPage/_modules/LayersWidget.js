'use strict'

const Util = require('Util');
const ListGroup = require('ListGroup');
const Grid = require('Grid');
const {
    Menu,
    MenuItem
} = require('electron').remote;
const Input = require('Input');
const TabGroup = require('TabGroup');


class LayersWidget {

    constructor() {
        this.element = Util.div(null, 'layers-widget');
        this.content = Util.div(null, 'content');
        this.tabs = new TabGroup(this.content);
        this.baselist = new ListGroup(this.content);
        this.overlaylist = new ListGroup(this.content);
        this.datalist = new ListGroup(this.content);
        this.overlaylist.hide();
        this.datalist.hide();
        this.tabs.addItem({
            name: '<span class="fa fa-map" title="base layers"></span>',
            id: 'base'
        });
        this.tabs.addItem({
            name: '<i class="fa fa-map-marker"></i><i class="fa fa-map-o"></i>',
            id: 'overlay'
        });
        this.tabs.addItem({
            name: '<span class="fa fa-database" title="data"></span>',
            id: 'data'
        });
        this.tabs.addClickListener('base', () => {
            this.baselist.show();
            this.overlaylist.hide();
            this.datalist.hide();
        });
        this.tabs.addClickListener('overlay', () => {
            this.baselist.hide();
            this.overlaylist.show();
            this.datalist.hide();
        });
        this.tabs.addClickListener('data', () => {
            this.baselist.hide();
            this.datalist.show();
            this.overlaylist.hide();
        });
        this.element.appendChild(this.content);
        this.baseLayer = null;
        this.baseLayers = {};
        this.overlayLayers = {};
    }

    setMapManager(mapManager) {
        this.mapManager = mapManager;

        this.mapManager.on('clean', () => {
            this.baselist.clean();
            this.overlaylist.clean();
            this.datalist.clean();
            this.baseLayer = null;
            this.baseLayers = {};
            this.overlayLayers = {};
        });

        this.mapManager.on('add:tileslayer', (e) => {
            let configuration = e.configuration;
            let layer = e.layer;

            let tools = this.createToolbox(layer, true, false, false);

            if (configuration.baseLayer) {
                if (!this.baseLayer) {
                    this.baseLayer = layer;
                    this.mapManager._map.addLayer(this.baseLayer);
                }
            }
            let customMenuItems = [];
            let calibrationSettingsMenuItem = new MenuItem({
                label: 'Calibration settings',
                click: () => {

                }
            });
            customMenuItems.push(calibrationSettingsMenuItem);
            let baseLayerMenuItem = new MenuItem({
                label: 'Base layer',
                type: 'checkbox',
                checked: configuration.baseLayer,
                click: () => {
                    if (this.baseLayer === layer) return;
                    this.mapManager.removeLayer(layer);
                    configuration.baseLayer = baseLayerMenuItem.checked;
                    this.mapManager.addLayer(configuration);
                }
            });
            customMenuItems.push(baseLayerMenuItem);

            this._addToList(layer, customMenuItems, tools, configuration);
        });

        this.mapManager.on('remove:layer', (e) => {
            if (e.configuration.baseLayer) {
                this.baselist.removeItem(e.configuration.id);
            } else if (e.configuration.type === 'pointsLayer' || e.configuration.type === 'pixelsLayer') {
                this.datalist.removeItem(e.configuration.id);
            } else {
                this.overlaylist.removeItem(e.configuration.id);
            }
        });
    }


    /**
     * Removes a layer from a list of layers.
     * @param {number} idLayer id of the layer to remove.
     * @param {Object} layers Object that contains a list of layers.
     */
    _removeLayer(idLayer, layers) {
        if (layers[idLayer]) {
            let layer = layers[idLayer];
            if (this.mapManager._map.hasLayer(layer)) {
                this.mapManager._map.removeLayer(layer);
            }
            delete layers[idLayer];
        }
    }

    _addToList(layer, customMenuItems, tools, configuration) {
        let list;
        if (configuration.baseLayer) {
            list = this.baselist;
        } else if (configuration.type === 'pointsLayer' || configuration.type === 'pixelsLayer') {
            list = this.datalist;
        } else {
            list = this.overlaylist;
        }
        let txtTitle = Input.input({
            value: configuration.name,
            className: 'list-input',
            readOnly: true,
            onblur: () => {
                txtTitle.readOnly = true;
            }
        });

        let context = new Menu();
        context.append(new MenuItem({
            label: 'Rename',
            click: () => {
                txtTitle.readOnly = false;
            }
        }));

        context.append(new MenuItem({
            label: 'Delete',
            click: () => {
                if (this.baseLayer === layer) {
                    return;
                }
                this.mapManager.removeLayer(layer);
            }
        }));

        customMenuItems.map((menuItem) => {
            context.append(menuItem);
        });

        list.addItem({
            id: configuration.id,
            title: txtTitle,
            details: tools,
            active: (this.baseLayer === layer) || (list === this.datalist) || (this.mapManager._map.hasLayer(layer)),
            oncontextmenu: () => {
                context.popup()
            },
            onclick: {
                active: (item, e) => {
                    if (configuration.baseLayer) {
                        this.mapManager._map.removeLayer(this.baseLayer);
                        this.baseLayer = layer;
                    }
                    this.mapManager._map.addLayer(layer);
                },
                deactive: (item, e) => {
                    if (!configuration.baseLayer) {
                        this.mapManager._map.removeLayer(layer);
                    } else {
                        item.element.classList.add('active'); //no deactive if baselayer
                    }
                }
            },
            key: layer._configuration.name,
            toggle: true
        });


        if (typeof layer.on === 'function') {
            layer.on('remove', () => {
                list.deactiveItem(configuration.id);
            });
        }


    }

    createToolbox(layer, hasOpacityControl, hasColorControl, hasRadiusControl) {
        let toolbox = Util.div(null, 'table-container toolbox');
        let configuration = layer._configuration;

        if (hasColorControl) {

        }

        if (hasRadiusControl) {

        }

        if (hasOpacityControl) {
            let opacityCell = Util.div(null, 'cell');

            let input = Input.input({
                label: '',
                className: 'form-control',
                parent: opacityCell,
                type: 'range',
                max: 1,
                min: 0,
                step: 0.1,
                value: configuration.opacity,
                placeholder: 'opacity',
                oninput: (inp) => {
                    configuration.opacity = Number(inp.value);
                    layer.setOpacity(configuration.opacity);
                }
            });

            toolbox.appendChild(opacityCell);
        }

        return toolbox;
    }


}

module.exports = LayersWidget;
