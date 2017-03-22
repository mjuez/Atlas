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
        //let outerGrid = new Grid(2, 1);
        //let topBar = Util.div(null, 'top-bar');
        //let title = document.createElement('SPAN');
        //title.className = 'title';
        //title.innerHTML = 'Layers';
        //outerGrid.addElement(title, 0, 0);
        /*let innerGrid = new Grid(2,3);
        let colorTitle = Util.div('Color:');
        let radiusTitle = Util.div('Radius:');
        let opacityTitle = Util.div('Opacity:');
        innerGrid.addElement(colorTitle,0,0);
        innerGrid.addElement(radiusTitle,0,1);
        innerGrid.addElement(opacityTitle,0,2);
        outerGrid.addElement(innerGrid.element,1,0);*/
        //topBar.appendChild(outerGrid.element);
        //this.element.appendChild(topBar);
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
            let configuration = e.configuration;
            let layer = e.layer;
            let details = new ToggleElement();
            details.hide();
            details.element.onclick = (e) => {
                e.stopPropagation()
            }
            Input.input({
                parent: details,
                label: 'opacity',
                type: 'range',
                min: 0,
                max: 1,
                step: 0.1,
                value: configuration.opacity || 1,
                onchange: (inp) => {
                    layer.setOpacity(inp.value);
                    configuration.opacity = inp.value;
                }
            });

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
                },
                onblur: () => {
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
                id: configuration.id,
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
                            item.element.classList.add('active');
                        }
                    }
                }
            };

            if (configuration.baseLayer) {
                this.baselist.addItem(opt);
                layer.on('remove', () => {
                    this.baselist.deactiveItem(configuration.id);
                });
            } else {
                this.overlaylist.addItem(opt);
                layer.on('remove', () => {
                    this.overlaylist.deactiveItem(configuration.id);
                });
            }
        });


        this.mapManager.on('add:pointslayermarkers', (e) => {
            let details = new ToggleElement();
            details.hide();
            details.element.onclick = (e) => {
                e.stopPropagation()
            }

            let configuration = e.configuration;
            let layer = e.layer;

            Input.input({
                parent: details,
                label: '',
                value: configuration.color,
                type: 'color',
                className: 'simple form-control',
                oninput: (inp) => {
                    layer.eachLayer((l) => {
                        configuration.color = inp.value;
                        configuration.fillColor = inp.value;
                        l.setStyle({
                            color: inp.value
                        });
                    });
                }
            });


            let title = Input.input({
                label: '',
                placeholder: 'name',
                className: 'list-input',
                value: configuration.name,
                onchange: () => {
                    configuration.name = title.value;
                    title.readOnly = true;
                },
                onblur: () => {
                    title.readOnly = true;
                }
            });
            title.readOnly = true;

            let menu = Menu.buildFromTemplate([{
                    label: 'delete',
                    click: () => {

                    }
                },
                {
                    label: 'edit',
                    click: () => {
                        details.toggle();
                    }
                }
            ]);

            this.overlaylist.addItem({
                title: title,
                details: details,
                key: `${configuration.name} ${configuration.authors}`,
                toggle: true,
                oncontextmenu: (item, e) => {
                    menu.popup();
                },
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
            let details = new ToggleElement();
            details.hide();
            let configuration = e.configuration;
            let layer = e.layer;
            details.element.onclick = (e) => {
                e.stopPropagation()
            }
            Input.input({
                parent: details,
                label: 'grid size',
                className: 'form-control simple',
                type: 'number',
                value: configuration.size,
                min: 1,
                onchange: (inp) => {
                    configuration.size = Number(inp.value);
                    //this.mapManager.reload();
                }
            });

            Input.input({
                parent: details,
                label: 'cell size',
                className: 'form-control simple',
                type: 'number',
                value: configuration.tileSize,
                min: 1,
                onchange: (inp) => {
                    configuration.tileSize = Number(inp.value);
                    //this.mapManager.reload();
                }
            });
            let title = Input.input({
                label: '',
                placeholder: 'name',
                className: 'list-input',
                value: configuration.name,
                onchange: () => {
                    configuration.name = title.value;
                    title.readOnly = true;
                },
                onblur: () => {
                    title.readOnly = true;
                }
            });
            title.readOnly = true;


            let menu = Menu.buildFromTemplate([{
                    label: 'delete',
                    click: () => {

                    }
                },
                {
                    label: 'edit',
                    click: () => {
                        details.toggle();
                    }
                }
            ]);

            this.overlaylist.addItem({
                title: title,
                details: details,
                key: `${configuration.name} ${configuration.authors}`,
                toggle: true,
                oncontextmenu: () => {
                    menu.popup();
                },
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
                details: details,
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
