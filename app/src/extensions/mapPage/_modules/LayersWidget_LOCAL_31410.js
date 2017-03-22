'use strict'

const Util = require('Util');
const ListGroup = require('ListGroup');
const Grid = require('Grid');
const Input = require('Input');

class LayersWidget {

    constructor(mapManager) {
        this.mapManager = mapManager;
        this.element = Util.div(null, 'layers-widget');
        this.content = Util.div(null, 'content');
        this.list = new ListGroup(this.content);
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
            this.list.clean();
        });

        this.mapManager.on('add:tileslayer', (e) => {
            let details = Util.div('tools will be here');

            let configuration = e.configuration;
            let layer = e.layer;

            if (configuration.baseLayer) {
                this.baseLayers.push(layer);
                if (!this.baseLayer) {
                    this.baseLayer = layer;
                    this.mapManager._map.addLayer(layer);
                }
            }

            this.list.addItem({
                id: configuration.name,
                title: configuration.name,
                subtitle: configuration.authors,
                body: details,
                key: `${configuration.name} ${configuration.authors}`,
                toggle: {
                  expand: true
                },
                onclick: {
                    active: () => {
                        this.mapManager._map.removeLayer(this.baseLayer);
                        this.baseLayer = layer;
                        this.mapManager._map.addLayer(layer);
                    }
                }
            });

            layer.on('remove', () => {
                this.list.deactiveItem(configuration.name);
            });
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

            this.list.addItem({
                title: title,
                body: details,
                key: `${configuration.name} ${configuration.authors}`,
                toggle: {
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
