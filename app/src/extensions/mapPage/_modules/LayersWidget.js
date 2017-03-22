'use strict'

const Util = require('Util');
const ListGroup = require('ListGroup');
const Grid = require('Grid');
const Input = require('Input');
const ToggleElement = require('ToggleElement');
const {
    Menu,
    MenuItem
} = require('electron').remote;
const TabGroup = require('TabGroup');

class LayersWidget {

    constructor(mapManager) {
        this.mapManager = mapManager;
        this.element = Util.div(null, 'layers-widget');
        this.content = Util.div(null, 'content');
        this.tabs = new TabGroup(this.content);
        this.baselist = new ListGroup(this.content);
        this.overlaylist = new ListGroup(this.content);
        this.datalist = new ListGroup(this.content);
        this.overlaylist.hide();
        this.datalist.hide();
        this.tabs.addItem({
            name: 'base',
            id: 'base'
        });
        this.tabs.addItem({
            name: 'overlay',
            id: 'overlay'
        });
        this.tabs.addItem({
            name: 'data',
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
        let topBar = Util.div(null, 'top-bar');
        let outerGrid = new Grid(2, 1);
        let title = document.createElement('SPAN');
        title.className = 'title';
        title.innerHTML = 'Layers';
        outerGrid.addElement(title, 0, 0);
        /*let innerGrid = new Grid(2,3);
        let colorTitle = Util.div('Color:');
        let radiusTitle = Util.div('Radius:');
        let opacityTitle = Util.div('Opacity:');
        innerGrid.addElement(colorTitle,0,0);
        innerGrid.addElement(radiusTitle,0,1);
        innerGrid.addElement(opacityTitle,0,2);
        outerGrid.addElement(innerGrid.element,1,0);*/
        topBar.appendChild(outerGrid.element);
        this.element.appendChild(topBar);
        this.element.appendChild(this.content);
        this.baseLayer = null;
        this.baseLayers = [];
        this.overlayLayers = [];
    }

    setMapManager(mapManager) {
        this.mapManager = mapManager;
        this.mapManager.on('clean', () => {
            this.baselist.clean();
            this.overlaylist.clean();
            this.datalist.clean();
            this.baseLayer = null;
            this.baseLayers = [];
            this.overlayLayers = [];
        });

        this.mapManager.on('add:tileslayer', (e) => {
            let details = new ToggleElement(Util.div('tools will be here'));
            details.hide();
            let configuration = e.configuration;
            let layer = e.layer;
            if (configuration.baseLayer) {
                if (!this.baseLayer) {
                    this.baseLayer = layer;
                    this.mapManager._map.addLayer(this.baseLayer);
                }
            }

            let title = Input.input({
                label: '',
                placeholder: 'name',
                className: 'list-input',
                value: configuration.name,
                onchange: () => {
                    configuration.name = title.value;
                    title.readOnly = true;
                }
            });
            title.readOnly = true;

            let menu = Menu.buildFromTemplate([{
                label: 'delete',
                click: () => {

                }
            }, {
                label: 'rename',
                click: () => {
                    title.readOnly = false;
                    title.focus();
                }
            }, {
                label: 'edit',
                click: () => {
                    details.show();
                }
            }]);



            let opt = {
                id: configuration.name,
                title: title,
                details: details,
                active: (this.baseLayer === layer),
                key: `${configuration.name} ${configuration.authors}`,
                oncontextmenu: (item, e) => {
                    //item.details.toggle();
                    menu.popup();
                },
                toggle: true,
                onclick: {
                    active: (item, e) => {
                        if (e.ctrlKey) {
                            details.toggle();
                            return;
                        }
                        if (configuration.baseLayer) {
                            this.mapManager._map.removeLayer(this.baseLayer);
                            this.baseLayer = layer;
                        }
                        this.mapManager._map.addLayer(layer);
                    },
                    deactive: (item, e) => {
                        if (e.ctrlKey) {
                            details.toggle();
                            item.element.classList.add('active');
                            return;
                        } else {
                            if (!configuration.baseLayer) {
                                this.mapManager._map.removeLayer(layer);
                            } else {
                                item.element.classList.add('active');
                            }
                        }
                    }
                }
            };

            if (configuration.baseLayer) {
                this.baselist.addItem(opt);
                layer.on('remove', () => {
                    this.baselist.deactiveItem(configuration.name);
                });
            } else {
                this.overlaylist.addItem(opt);
                layer.on('remove', () => {
                    this.overlaylist.deactiveItem(configuration.name);
                });
            }



        });


        this.mapManager.on('add:pointslayermarkers', (e) => {
            let details = Util.div('tools will be here');

            let configuration = e.configuration;
            let layer = e.layer;

            let title = Input.input({
                label: '',
                placeholder: 'name',
                className: 'list-input',
                value: configuration.name,
                oninput: () => {
                    configuration.name = title.value;
                }
            });
            title.readOnly = true;

            this.overlaylist.addItem({
                title: title,
                body: details,
                key: `${configuration.name} ${configuration.authors}`,
                toggle: true,
                onclick: {
                    active: () => {
                        this.mapManager._map.addLayer(layer);
                    },
                    deactive: () => {
                        this.mapManager._map.removeLayer(layer);
                    }
                }
            });
        });

        this.mapManager.on('add:guidelayer', (e) => {
            let details = Util.div('tools will be here');

            let configuration = e.configuration;
            let layer = e.layer;

            let title = Input.input({
                label: '',
                placeholder: 'name',
                className: 'list-input',
                value: configuration.name,
                oninput: () => {
                    configuration.name = title.value;
                }
            });
            title.readOnly = true;

            this.overlaylist.addItem({
                title: title,
                body: details,
                key: `${configuration.name} ${configuration.authors}`,
                toggle: false,
                onclick: {
                    active: () => {
                      this.mapManager._map.addLayer(layer);
                    },
                    deactive: () => {
                      this.mapManager._map.removeLayer(layer);
                    }
                }
            });
        });


        this.mapManager.on('add:pointslayer', (e) => {
            let details = Util.div('tools will be here');

            let configuration = e.configuration;
            let layer = e.layer;

            let title = Input.input({
                label: '',
                placeholder: 'name',
                className: 'list-input',
                value: configuration.name,
                oninput: () => {
                    configuration.name = title.value;
                }
            });
            title.readOnly = true;

            this.datalist.addItem({
                title: title,
                body: details,
                key: `${configuration.name} ${configuration.authors}`,
                toggle: false,
                active: true,
                onclick: {
                    active: () => {},
                    deactive: () => {}
                }
            });
        });

        this.mapManager.on('add:pixelslayer', (e) => {
            let details = Util.div('tools will be here');
            let configuration = e.configuration;
            let layer = e.layer;
            let title = Input.input({
                label: '',
                placeholder: 'name',
                className: 'list-input',
                value: configuration.name,
                oninput: () => {
                    configuration.name = title.value;
                }
            });
            title.readOnly = true;

            this.datalist.addItem({
                title: title,
                body: details,
                key: `${configuration.name} ${configuration.authors}`,
                toggle: false,
                active: true,
                onclick: {
                    active: () => {},
                    deactive: () => {}
                }
            });
        });



    }

    reload() {
        // THIS IS TEMPORAL -> LAYERS WITHOUT ORDER.
        /*this.list.clean();
        let layers = this.mapManager.getLayers();
        console.log(layers);
        layers.map((type) => {
            if (type) {
                type.map((layer) => {
                    let layerConfig = layer;
                    if (layer._configuration) {
                        layerConfig = layer._configuration;
                    }

                    let details = Util.div('hola que tal');

                    this.list.addItem({
                        title: layerConfig.name,
                        subtitle: layerConfig.authors,
                        body: details,
                        key: layerConfig.name,
                        toggle: {
                            justOne: true,
                            expand: true
                        },
                        onclick: {
                            active: () => {
                            },

                            deactive: () => {
                            }
                        }
                    });
                });
            }
        });*/
    }

}

module.exports = LayersWidget;
