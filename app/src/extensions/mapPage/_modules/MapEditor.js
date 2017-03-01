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

'use strict';

const Grid = require('Grid');
const EventEmitter = require('events');
const Sidebar = require('Sidebar');
const {
    dialog
} = require('electron').remote;
const Modal = require('Modal');
const ButtonsContainer = require('ButtonsContainer');

const Util = require('Util');
const Input = require('Input');


function getLayersName(conf) {
    if (!conf.layers) return [];
    return Object.keys(conf.layers).map((k) => {
        return conf.layers[k].name || k;
    });
}



class MapEditor extends EventEmitter {
    constructor(manager) {
        super();
        this.manager = manager;
    }

    layerPreviewImage(layer, parent) {
        if (layer) {
            if (typeof layer.previewImageUrl === 'string') {
                let img = document.createElement('IMG');
                img.width = 150;
                img.height = 150;
                img.src = layer.previewImageUrl;
                if (parent) {
                    if (parent.appendChild) {
                        parent.appendChild(img);
                    }
                } else {
                    return img;
                }
            }
        }
    }

    layerPreviewInfo(layer, parent) {
        if (layer) {
            if (typeof layer.previewImageUrl === 'string') {
                let info = document.createElement('DIV');
                let ty = document.createElement('STRONG');
                ty.innerHTML = `Layer type: ${layer.type}`;
                info.appendChild(ty);
                if (parent) {
                    if (parent.appendChild) {
                        parent.appendChild(info);
                    }
                } else {
                    return info;
                }
            }
        }
    }

    layerRemoveButton(layer, parent) {
        let layers = this.manager._configuration.layers;
        let a = new ButtonsContainer(document.createElement('DIV'));
        let text = 'Remove layer';
        if (layer) {
            if (Object.keys(layers).indexOf(layer.name) < 0) {
                text = 'Layer removed';
            }
        }
        a.addButton({
            id: 'removelayerbutton',
            text: text,
            className: 'btn-positive',
            toggle: true,
            groupId: 'xxxx',
            action: {
                active: (btn) => {
                    delete layers[layer.name]; //delete the layer
                    btn.innerHTML = 'Layer removed';
                },
                deactive: (btn) => {
                    layers[layer.name] = layer; //re-add the layer the only problem is that it changes the order of the layers...it's ok
                    btn.innerHTML = 'Remove layer'
                }
            }
        });
        if (layer) {
            if (Object.keys(layers).indexOf(layer.name) < 0) {
                a.buttons['removelayerbutton'].className = 'btn-positive active';
            }
        }
        parent.appendChild(a.element);
    }

    layerEditors(layer, parent) {
        if (!layer) return;
        Input.input({
            label: 'Name',
            className: 'simple form-control',
            parent: parent,
            value: layer.name,
            placeholder: 'layer name',
            onblur: (inp) => {
                layer.name = inp.value;
                this.emit('hard_change');

            }
        });
        Input.input({
            label: 'Authors',
            className: 'simple form-control',
            parent: parent,
            value: layer.authors,
            placeholder: 'layer authors',
            oninput: (inp) => {
                layer.authors = inp.value;
                this.emit('change');
            }
        });
        switch (layer.type) {
            case 'tilesLayer':
                Input.input({
                    label: 'Tiles url template',
                    className: 'simple form-control',
                    parent: parent,
                    type: 'url',
                    value: layer.tilesUrlTemplate,
                    placeholder: 'tiles url template',
                    onblur: (inp) => {
                        layer.tilesUrlTemplate = inp.value;
                        this.emit('hard_change');
                    }
                });
                Input.input({
                    label: 'MaxZoom',
                    className: 'simple form-control',
                    parent: parent,
                    type: 'number',
                    value: layer.maxZoom,
                    placeholder: 'MaxZoom',
                    onblur: (inp) => {
                        layer.maxZoom = Number(inp.value);
                        this.emit('hard_change');
                    }
                });
                Input.input({
                    label: 'MinZoom',
                    className: 'simple form-control',
                    parent: parent,
                    type: 'number',
                    value: layer.minZoom,
                    placeholder: 'minZoom',
                    onblur: (inp) => {
                        layer.minZoom = Number(inp.value);
                        this.emit('hard_change');
                    }
                });
                Input.input({
                    label: 'Calibrated Size',
                    className: 'simple form-control',
                    parent: parent,
                    type: 'number',
                    value: layer.sizeCal || 256,
                    placeholder: 'cal size',
                    oninput: (inp) => {
                        layer.sizeCal = Number(inp.value);
                        this.emit('change');
                    }
                });
                Input.input({
                    label: 'Calibrated depth',
                    className: 'simple form-control',
                    parent: parent,
                    type: 'number',
                    value: layer.depthCal || 1,
                    placeholder: 'cal size',
                    oninput: (inp) => {
                        layer.depthCal = Number(inp.value);
                        this.emit('change');
                    }
                });
                Input.input({
                    label: 'Calibration unit',
                    className: 'simple form-control',
                    parent: parent,
                    value: layer.unitCal || 'u',
                    placeholder: 'cal unit',
                    oninput: (inp) => {
                        layer.unitCal = inp.value;
                        this.emit('change');
                    }
                });
                Input.input({
                    label: 'Opacity',
                    className: 'simple form-control',
                    parent: parent,
                    type: 'range',
                    max: 1,
                    min: 0,
                    step: 0.1,
                    value: layer.opacity,
                    placeholder: 'opacity',
                    oninput: (inp) => {
                        layer.opacity = Number(inp.value);
                        this.manager.getLayers('tilesLayer')[layer.typeid].setOpacity(layer.opacity);
                        this.emit('change');
                    }
                });
                Input.input({
                    label: 'Base layer',
                    className: 'simple form-control',
                    parent: parent,
                    type: 'checkbox',
                    checked: layer.baseLayer,
                    onchange: (inp) => {
                        layer.baseLayer = Boolean(inp.checked);
                        this.emit('hard_change');
                    }
                });
                break;
            case 'pointsLayer':
                Input.input({
                    label: 'Points url template',
                    className: 'simple form-control',
                    parent: parent,
                    type: 'text',
                    value: layer.pointsUrlTemplate,
                    placeholder: 'points url template',
                    onblur: (inp) => {
                        layer.pointsUrlTemplate = inp.value;
                        this.emit('hard_change');
                    }
                });
                Input.input({
                    label: 'Size',
                    className: 'simple form-control',
                    parent: parent,
                    type: 'number',
                    value: layer.size,
                    placeholder: 'size',
                    onblur: (inp) => {
                        layer.size = Number(inp.value);
                        this.emit('hard_change');
                    }
                });
                Input.input({
                    label: 'Tile size',
                    className: 'simple form-control',
                    parent: parent,
                    type: 'number',
                    value: layer.tileSize,
                    placeholder: 'size',
                    onblur: (inp) => {
                        layer.tileSize = Number(inp.value);
                        this.emit('hard_change');
                    }
                });
                Input.input({
                    label: 'Easy to draw',
                    className: 'simple form-control',
                    parent: parent,
                    type: 'checkbox',
                    checked: layer.easyToDraw,
                    onchange: (inp) => {
                        layer.easyToDraw = Boolean(inp.checked);
                        this.emit('hard_change');
                    }
                });
                Input.input({
                    label: 'Exclude points touching CF',
                    className: 'simple form-control',
                    parent: parent,
                    type: 'checkbox',
                    checked: layer.excludeCF,
                    onchange: (inp) => {
                        layer.excludeCF = Boolean(inp.checked);
                        this.emit('hard_change');
                    }
                });
                Input.input({
                    label: 'Color',
                    className: 'simple form-control',
                    parent: parent,
                    type: 'color',
                    value: layer.color,
                    onblur: (inp) => {
                        layer.color = inp.value;
                        this.emit('hard_change');
                    }
                });
                Input.input({
                    label: 'Radius',
                    className: 'simple form-control',
                    parent: parent,
                    type: 'number',
                    value: layer.radius || 4,
                    onblur: (inp) => {
                        layer.radius = inp.value;
                        this.emit('hard_change');
                    }
                });

                break;
            case 'pixelsLayer':
                Input.input({
                    label: 'Pixels url template',
                    className: 'simple form-control',
                    parent: parent,
                    type: 'text',
                    value: layer.pixelsUrlTemplate,
                    placeholder: 'pixels url template',
                    onblur: (inp) => {
                        layer.pixelsUrlTemplate = inp.value;
                        this.emit('hard_change');
                    }
                });
                Input.selectInput({
                    parent: parent,
                    className: 'simple form-control',
                    choices: ['holes', 'area', 'density', 'probability'],
                    label: 'Role',
                    value: layer.role,
                    oninput: (inp) => {
                        layer.role = inp.value;
                        this.emit('change');
                    }
                });
                Input.input({
                    label: 'Norm',
                    className: 'simple form-control',
                    parent: parent,
                    type: 'number',
                    value: layer.norm,
                    placeholder: 'normalization',
                    oninput: (inp) => {
                        layer.norm = Number(inp.value);
                        this.emit('change');
                    }
                });
                Input.input({
                    label: 'Size',
                    className: 'simple form-control',
                    parent: parent,
                    type: 'number',
                    value: layer.size,
                    placeholder: 'size',
                    oninput: (inp) => {
                        layer.size = Number(inp.value);
                        this.emit('change');
                    }
                });
                Input.input({
                    label: 'Tile size',
                    className: 'simple form-control',
                    parent: parent,
                    type: 'number',
                    value: layer.tileSize,
                    placeholder: 'size',
                    oninput: (inp) => {
                        layer.tileSize = Number(inp.value);
                        this.emit('change');
                    }
                });
                break;
            case 'imageLayer':
                Input.input({
                    label: 'Image url',
                    className: 'simple form-control',
                    parent: parent,
                    type: 'text',
                    value: layer.imageUrl,
                    placeholder: 'image url',
                    oninput: (inp) => {
                        layer.imageUrl = inp.value;
                        this.emit('hard_change');
                    }
                });
                Input.input({
                    label: 'Original Size',
                    className: 'simple form-control',
                    parent: parent,
                    type: 'number',
                    value: layer.original_size || 256,
                    placeholder: 'original size',
                    oninput: (inp) => {
                        inp.value = layer.original_size;
                        this.emit('change');
                    }
                });
                Input.input({
                    label: 'Opacity',
                    className: 'simple form-control',
                    parent: parent,
                    type: 'range',
                    max: 1,
                    min: 0,
                    step: 0.1,
                    value: layer.opacity,
                    placeholder: 'opacity',
                    oninput: (inp) => {
                        layer.opacity = Number(inp.value);
                        this.manager.getLayers('imageLayer')[layer.typeid].setOpacity(layer.opacity);
                        this.emit('change');
                    }
                });

                break;
            case 'guideLayer':
                Input.input({
                    label: 'Size',
                    className: 'simple form-control',
                    parent: parent,
                    type: 'number',
                    value: layer.size,
                    placeholder: 'size',
                    onblur: (inp) => {
                        layer.size = Number(inp.value);
                        this.emit('hard_change');
                    }
                });
                Input.input({
                    label: 'Tile size',
                    className: 'simple form-control',
                    parent: parent,
                    type: 'number',
                    value: layer.tileSize,
                    placeholder: 'tile size',
                    onblur: (inp) => {
                        layer.tileSize = Number(inp.value);
                        this.emit('hard_change');
                    }
                });
                Input.input({
                    label: 'Color',
                    className: 'simple form-control',
                    parent: parent,
                    type: 'color',
                    value: layer.color,
                    oninput: (inp) => {
                        layer.color = inp.value;
                        this.manager.getLayers('guideLayer')[layer.typeid].setStyle({
                          color: layer.color,
                          fillColor: layer.color
                        });
                        this.emit('change');
                    }
                });
                break;

            case 'drawnPolygons':

                break;
            default:

        }
    }


    editor(parent) {
        let conf = this.manager._configuration;
        let editor = new Grid(1, 2);
        let left = document.createElement('DIV');
        let right = document.createElement('DIV');

        Input.input({
            parent: left,
            label: 'Name',
            className: 'simple form-control',
            value: conf.name,
            placeholder: 'map name',
            onblur: (inp) => {
                conf.name = inp.value;
                this.emit('change');
            }
        });

        Input.input({
            parent: left,
            className: 'simple form-control',
            label: 'Authors',
            value: conf.authors,
            placeholder: 'authors',
            onblur: (inp) => {
                conf.authors = inp.value;
                this.emit('change');
            }
        });

        Input.input({
            parent: left,
            className: 'simple form-control',
            type: 'date',
            label: 'Date',
            valueAsDate: new Date(conf.date),
            placeholder: 'creation date',
            onblur: (inp) => {
                conf.date = inp.value;
                this.emit('change');
            }
        });

        Input.selectInput({
            label: 'Layers',
            parent: left,
            choices: getLayersName(conf),
            className: 'simple form-control',
            oninput: (inp) => {
                Util.empty(right, right.firstChild);
                let layer = conf.layers[Object.keys(conf.layers)[inp.selectedIndex]];
                let newlayer = conf.layers[Object.keys(conf.layers)[inp.selectedIndex]];
                this.layerEditors(newlayer, right);
                this.layerRemoveButton(layer, right);
            }
        });

        editor.addElement(left, 0, 0);
        editor.addElement(right, 0, 1);

        parent.appendChild(editor.element);
    }

    modal(conf, cl) {
        let newconf = Util.clone(conf);
        let newlayers = Util.clone(conf.layers);
        let modal = new Modal({
            title: `${conf.name}`,
            height: 'auto',
            width: '80%'
        });

        let grid = new Grid(2, 2);

        let left = document.createElement('DIV');
        let right = document.createElement('DIV');

        grid.addElement(left, 0, 0);
        grid.addElement(right, 0, 2);
        Input.input({
            parent: left,
            label: 'Name',
            className: 'simple form-control',
            value: newconf.name,
            placeholder: 'map name',
            onblur: (inp) => {
                newconf.name = inp.value;
            }
        });
        Input.input({
            parent: left,
            className: 'simple form-control',
            label: 'Authors',
            value: newconf.authors,
            placeholder: 'authors',
            onblur: (inp) => {
                newconf.authors = inp.value;
            }
        });
        Input.input({
            parent: left,
            className: 'simple form-control',
            type: 'date',
            label: 'Date',
            valueAsDate: new Date(newconf.date),
            placeholder: 'creation date',
            onblur: (inp) => {
                newconf.date = inp.value;
            }
        });
        Input.selectInput({
            parent: left,
            className: 'simple form-control',
            choices: ['local', 'remote'],
            label: 'Source',
            value: newconf.source,
            oninput: (inp) => {
                newconf.source = inp.value;
            }
        });
        Input.selectInput({
            label: 'Layers',
            parent: left,
            choices: getLayersName(conf),
            className: 'simple form-control',
            oninput: (inp) => {
                Util.empty(right, right.firstChild);
                Util.empty(center, center.firstChild);
                let layer = conf.layers[Object.keys(conf.layers)[inp.selectedIndex]];
                let newlayer = newconf.layers[Object.keys(conf.layers)[inp.selectedIndex]];
                this.layerPreviewImage(layer, right);
                this.layerEditors(newlayer, right);
                this.layerRemoveButton(layer, right);
            }
        });
        this.layerPreviewImage(newconf.layers[Object.keys(newconf.layers)[0]], right);
        // MapEdit.layerPreviewInfo(newconf.layers[Object.keys(newconf.layers)[0]], right);
        this.layerEditors(newconf.layers[Object.keys(newconf.layers)[0]], center);
        this.layerRemoveButton(conf.layers[Object.keys(conf.layers)[0]], right);
        let text;
        switch (conf.new) {
            case true:
                text = 'Add'
                break;
            default:
                text = 'Save'
        }
        let Bc = new ButtonsContainer(document.createElement('DIV'));
        Bc.addButton({
            id: 'CancelMap00',
            text: 'Cancel',
            action: () => {
                modal.destroy();
            },
            className: 'btn-default'
        });
        Bc.addButton({
            id: 'AddMap00',
            text: text,
            action: () => {
                if (typeof cl === 'function') {
                    cl(newconf);
                }
                modal.destroy();
            },
            className: 'btn-default'
        });
        let footer = document.createElement('DIV');
        footer.appendChild(Bc.element);
        modal.addBody(grid.element);
        modal.addFooter(footer);
        modal.show();
    }


}


module.exports = MapEditor;