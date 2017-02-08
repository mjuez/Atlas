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

const Sidebar = require('Sidebar');
const {
    dialog
} = require('electron').remote;
const Modal = require('Modal');
const ButtonsContainer = require('ButtonsContainer');

const Util = require('Util');
const Input = require('Input');

class MapEdit {
    constructor() {
        return null;
    }

    static layerPreviewInfo(layer, parent) {
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

    static layerPreviewImage(layer, parent) {
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


    static getLayersName(conf) {
        return Object.keys(conf.layers).map((k) => {
            return conf.layers[k].name || k;
        });
    }

    static editLayersModal(conf, cl) {
        let newlayers = Util.clone(conf.layers);
        let modal = new Modal({
            title: `Edit ${conf.name} layers`,
            height: 'auto'
        });
        let body = document.createElement('DIV');
        body.className = 'flex-container';
        let left = document.createElement('DIV');
        left.width = '40%';
        let right = document.createElement('DIV');
        right.width = '60%';
        body.appendChild(left);
        body.appendChild(right);
        Input.selectInput({
            label: 'Layers',
            parent: left,
            choices: MapEdit.getLayersName(conf),
            className: 'simple form-control',
            oninput: (inp) => {
                Util.empty(right, right.firstChild);
                let layer = newlayers[Object.keys(newlayers)[inp.selectedIndex]];
                MapEdit.layerEditors(layer, right);
            }
        });
        MapEdit.layerEditors(newlayers[Object.keys(newlayers)[0]], right);

        let Bc = new ButtonsContainer(document.createElement('DIV'));
        Bc.addButton({
            id: 'closeedilayers000',
            text: 'Cancel',
            action: () => {
                modal.destroy();
            },
            className: 'btn-default'
        });
        Bc.addButton({
            id: 'saveeedilayers000',
            text: 'Save',
            action: () => {
                if (typeof cl === 'function') {
                    conf.layers = newlayers;
                    cl(conf);
                }
                modal.destroy();
            },
            className: 'btn-default'
        });


        let footer = document.createElement('DIV');
        footer.appendChild(Bc.element);
        modal.addBody(body);
        modal.addFooter(footer);
        modal.show();

    }

    static layerEditors(layer, parent) {
        if (layer) {
            let ed = document.createElement('DIV');
            ed.className = 'flex-container';
            let left = document.createElement('DIV');
            left.width = '40%';
            let right = document.createElement('DIV');
            right.width = '60%';
            ed.appendChild(right); //left and right are inverted :-)
            ed.appendChild(left);
            Input.input({
                parent: right,
                className: 'simple form-control',
                type: 'text',
                label: 'Name',
                value: layer.name,
                placeholder: 'layer name',
                onblur: (inp) => {
                    layer.name = inp.value;
                }
            });
            Input.input({
                parent: right,
                className: 'simple form-control',
                type: 'text',
                label: 'Authors',
                value: layer.authors,
                placeholder: 'layer authors',
                onblur: (inp) => {
                    layer.authors = inp.value;
                }
            });
            Input.selectInput({
                parent: right,
                label: 'Type',
                className: 'simple form-control',
                choices: ['tilesLayer', 'pointsLayer', 'pixelsLayer', 'imageLayer', 'guideLayer'],
                value: layer.type,
                oninput: (inp) => {
                    dialog.showMessageBox({
                        title: 'Change layer type?',
                        type: 'warning',
                        buttons: ['No', "Yes"],
                        message: `Changing the layer type could make the layer unavailable`,
                        noLink: true
                    }, (id) => {
                        if (id > 0) {
                            layer.type = inp.value;
                        } else {
                            inp.value = layer.type;
                        }
                    });
                }
            });

            MapEdit.layerSpecificEditors(layer, right);

            MapEdit.layerPreviewImage(layer, left);


            if (parent) {
                if (parent.appendChild) {
                    parent.appendChild(ed);
                }
            } else {
                return ed;
            }

        }
    }

    static previewModal(conf, cl) {
        let newconf = Util.clone(conf);
        let modal = new Modal({
            title: `${conf.name}`,
            height: 'auto'
        });
        let body = document.createElement('DIV');
        body.className = 'flex-container';
        let left = document.createElement('DIV');
        left.width = '40%';
        let right = document.createElement('DIV');
        right.width = '60%';
        body.appendChild(left);
        body.appendChild(right);
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
            choices: ['remote', 'local'],
            label: 'Source',
            value: newconf.source,
            oninput: (inp) => {
                newconf.source = inp.value;
            }
        });
        Input.selectInput({
            label: 'Layers',
            parent: left,
            choices: MapEdit.getLayersName(conf),
            className: 'simple form-control',
            oninput: (inp) => {
                Util.empty(right, right.firstChild);
                let layer = conf.layers[Object.keys(conf.layers)[inp.selectedIndex]];
                MapEdit.layerPreviewImage(layer, right);
                MapEdit.layerPreviewInfo(layer, right);
            }
        });
        MapEdit.layerPreviewImage(conf.layers[Object.keys(conf.layers)[0]], right);
        MapEdit.layerPreviewInfo(conf.layers[Object.keys(conf.layers)[0]], right);
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
        modal.addBody(body);
        modal.addFooter(footer);
        modal.show();
    }



    static layerSpecificEditors(layer, parent) {
        switch (layer.type) {
            case 'tilesLayer':
                Input.input({
                    label: 'Tiles url template',
                    className: 'simple form-control',
                    parent: parent,
                    type: 'url',
                    value: layer.tilesUrlTemplate,
                    placeholder: 'tiles url template',
                    oninput: (inp) => {
                        layer.tilesUrlTemplate = inp.value;
                    }
                });
                Input.input({
                    label: 'MaxZoom',
                    className: 'simple form-control',
                    parent: parent,
                    type: 'number',
                    value: layer.maxZoom,
                    placeholder: 'MaxZoom',
                    oninput: (inp) => {
                        layer.maxZoom = Number(inp.value);
                    }
                });
                Input.input({
                    label: 'MinZoom',
                    className: 'simple form-control',
                    parent: parent,
                    type: 'number',
                    value: layer.minZoom,
                    placeholder: 'minZoom',
                    oninput: (inp) => {
                        layer.minZoom = Number(inp.value);
                    }
                });
                Input.input({
                    label: 'MaxNativeZoom',
                    className: 'simple form-control',
                    parent: parent,
                    type: 'number',
                    value: layer.maxNativeZoom,
                    placeholder: 'MaxNativeZoom',
                    oninput: (inp) => {
                        layer.maxNativeZoom = Number(inp.value);
                    }
                });
                Input.input({
                    label: 'MinNativeZoom',
                    className: 'simple form-control',
                    parent: parent,
                    type: 'number',
                    value: layer.minNativeZoom,
                    placeholder: 'minNativeZoom',
                    oninput: (inp) => {
                        layer.minNativeZoom = Number(inp.value);
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
                    oninput: (inp) => {
                        layer.pointsUrlTemplate = inp.value;
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
                    }
                });
                Input.input({
                    label: 'Radius',
                    className: 'simple form-control',
                    parent: parent,
                    type: 'number',
                    value: layer.radius || 4,
                    oninput: (inp) => {
                        layer.radius = inp.value;
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
                    oninput: (inp) => {
                        layer.pixelsUrlTemplate = inp.value;
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
                    oninput: (inp) => {
                        layer.size = Number(inp.value);
                    }
                });
                Input.input({
                    label: 'Tile size',
                    className: 'simple form-control',
                    parent: parent,
                    type: 'number',
                    value: layer.tileSize,
                    placeholder: 'tile size',
                    oninput: (inp) => {
                        layer.tileSize = Number(inp.value);
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
                    }
                });
                break;

            case 'drawnPolygons':

                break;
            default:

        }
    }

}


module.exports = MapEdit;
