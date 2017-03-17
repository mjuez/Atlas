'use strict'

const Util = require('Util');
const ListGroup = require('ListGroup');
const Grid = require('Grid');

class LayersWidget {

    constructor(mapManager) {
        this.mapManager = mapManager;
        this.element = Util.div(null, 'layers-widget');
        this.content = Util.div(null, 'content');
        this.list = new ListGroup(this.content);
        let topBar = Util.div(null, 'top-bar');
        let outerGrid = new Grid(2,1);
        let innerGrid = new Grid(2,3);
        let title = document.createElement('SPAN');
        title.className = 'title';
        title.innerHTML = 'Layers';
        outerGrid.addElement(title,0,0);
        let colorTitle = Util.div('Color:');
        let radiusTitle = Util.div('Radius:');
        let opacityTitle = Util.div('Opacity:');
        innerGrid.addElement(colorTitle,0,0);
        innerGrid.addElement(radiusTitle,0,1);
        innerGrid.addElement(opacityTitle,0,2);
        outerGrid.addElement(innerGrid.element,1,0);
        topBar.appendChild(outerGrid.element);
        this.element.appendChild(topBar);
        this.element.appendChild(this.content);
        this.selectedLayer = null;
    }

    setMapManager(mapManager) {
        this.mapManager = mapManager;
    }

    reload() {
        // THIS IS TEMPORAL -> LAYERS WITHOUT ORDER.
        this.list.clean();
        let layers = this.mapManager.getLayers();
        console.log(layers);
        layers.map((type) => {
            if (type) {
                type.map((layer) => {
                    let layerConfig = layer;
                    if(layer._configuration){
                        layerConfig = layer._configuration;
                    }
                    this.list.addItem({
                        title: layerConfig.name,
                        body: layerConfig.authors,
                        key: layerConfig.name,
                        toggle: {
                            justOne: true
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
        });
    }

}

module.exports = LayersWidget;