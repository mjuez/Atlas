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

const os = require('os');
const fs = require('fs');
const {
    dialog
} = require('electron').remote;
const Util = require('Util');


class MapImport {
    constructor() {
        console.log('MapImport is just a container of static methods');
    }

    static loadMapfromFile(cl) {
        dialog.showOpenDialog({
            title: "Select a configuration file",
            properties: ['openFile'],
            filters: [{
                name: 'Configuration file',
                extensions: ['mapconfig', 'json']
            }]
        }, (filename) => {
            if (filename === undefined) return;
            fs.readFile(filename[0], 'utf-8', (err, data) => {
                if (err) {
                    this.fire('error', err.message);
                    return;
                }
                let configuration = JSON.parse(data);
                configuration.type = configuration.type || 'undefined';
                let id = 2;
                if (!configuration.type.includes('map')) {
                    id = dialog.showMessageBox({
                        title: 'Type "map" not specified in configuration file',
                        type: 'warning',
                        buttons: ['Cancel', 'Add anyway'],
                        message: `The type specified in the configuration is: ${configuration.type}`,
                        detail: `trying to add this map could result in an error`,
                        noLink: true
                    });
                }
                if (id === 1) {
                    configuration.type = 'map';
                }
                if (id >= 1) {
                    configuration.basePath = MapImport.basePath(configuration, filename[0]);
                    configuration = MapImport.buildConfiguration(configuration);
                    Util.merge(configuration, MapImport.baseConfiguration());
                    if (typeof cl === 'function') {
                        cl(configuration);
                    }
                }
            });
        });
    }

    static baseConfiguration() {
        return {
            type: 'map',
            name: 'new map',
            authors: os.userInfo().username,
            date: (new Date()).toDateString(),
            layers: [],
            new: true,
            basePath: '',
            minZoom: 0
        };
    }

    static basePath(configuration, filename) {
        if (configuration) {

            if (configuration.basePath) {
                if (configuration.source === "remote" |
                    configuration.source === "online" |
                    configuration.source === "server") {

                } else {
                    let ch = dialog.showMessageBox({
                        type: "question",
                        buttons: ['yes', 'no'],
                        title: 'Base path',
                        message: 'redefine the basePath ? ',
                        detail: ''
                    });
                    if (ch === 1) {
                        return configuration.basePath;
                    } else {
                        const path = require("path");
                        return filename.substr(0, filename.lastIndexOf(path.sep) + 1);
                    }
                }
            } else {
                if (configuration.source === "remote" |
                    configuration.source === "online" |
                    configuration.source === "server") {
                    return "";
                } else if (filename) {
                    const path = require("path");
                    return filename.substr(0, filename.lastIndexOf(path.sep) + 1);
                } else {
                    return "";
                }
            }
        } else {
            if (filename) {
                const path = require("path");
                return filename.substr(0, filename.lastIndexOf(path.sep) + 1);
            } else {
                return "";
            }
        }
    }

    static findConfigurationSync(path, name) {
        let options = [];
        let files = fs.readdirSync(path);
        if (files) {
            for (var f in files) {
                if (files[f].endsWith(".json")) {
                    if (files[f].includes(name)) return Util.readJSONsync(path + files[f]);
                    options.push(files[f]);
                }
                if (files[f].endsWith(".mapconfig")) {
                    if (files[f].includes(name)) return Util.readJSONsync(path + files[f]);
                    options.push(files[f]);
                }
            }
        }
        if (options.length == 1) {
            return Util.readJSONsync(path + options[0]);
        } else {
            if (options.length == 0) {
                return;
            } else {
                return Util.readJSONsync(path + options[0]);
            }
        }
    }


    static buildConfiguration(configuration) {


        if (!configuration.source) {
            if (configuration.basePath) {
                if (configuration.basePath.startsWith('http')) {
                    configuration.source = 'remote';
                }
                if (configuration.basePath.startsWith('/home')) {
                    configuration.source = 'local';
                }
                if (configuration.basePath.startsWith('file')) {
                    configuration.source = 'local';
                }
            }
        }
        if (configuration.source === 'server' || configuration.source === 'online') {
            configuration.source = 'remote';
        }

        if (!configuration.name) {
            if (configuration.Name) {
                configuration.name = configuration.Name;
                delete configuration.Name;
            } else if (configuration.NAME) {
                configuration.name = configuration.NAME;
                delete configuration.NAME;
            } else if (configuration.alias) {
                configuration.name = configuration.alias.replace(" ", "_");
            }
        }

        configuration.size_cal = configuration.size_cal || 1;
        configuration.depth_cal = configuration.depth_cal || 1;

        let layers = configuration.layers;
        let tiles = configuration.tilesLayers;
        let points = configuration.pointsLayers;
        let pixels = configuration.pixelsLayers;
        let guide = configuration.guideLayers;
        let grid = configuration.gridLayers;
        let polygons = configuration.polygons;
        let regions = configuration.regions;

        let alls = {
            layers,
            tiles,
            points,
            pixels,
            guide,
            grid,
            polygons,
            regions
        }

        if (!configuration.authors) {
            if (configuration.author) {
                configuration.authors = configuration.author;
            } else if (configuration.auth) {
                configuration.authors = configuration.auth;
            } else if (configuration.AUTHORS) {
                configuration.authors = configuration.AUTHORS;
            } else if (configuration.AUTHOR) {
                configuration.authors = configuration.AUTHORS;
            } else {
                configuration.authors = "Unknown";
            }
        }

        configuration.layers = {};
        let id = 0;
        const path = require("path");

        for (var a in alls) {
            for (var lay in alls[a]) {
                if (typeof alls[a][lay] === 'string' || alls[a][lay] instanceof String) {
                    // if lay is just a string we look at the corresponding folder to find the config file
                    try {
                        let c = MapImport.findConfigurationSync(configuration.basePath + alls[a][lay] + path.sep, alls[a][lay]);
                        c.basePath = c.basePath  || (configuration.basePath + alls[a][lay] + path.sep);
                        configuration.layers[alls[a][lay]] = MapImport.parseLayerConfig(c);
                        configuration.layers[alls[a][lay]].id = id;
                        id = id + 1;
                    } catch (e) {
                        throw e;
                    }
                } else {
                    // otherwise we assume lay is a configuration object
                    if (alls[a][lay].name) {
                        //if there is a name use it
                        configuration.layers[alls[a][lay].name] = MapImport.parseLayerConfig(alls[a][lay]);
                        configuration.layers[alls[a][lay].name].id = id;
                        id = id + 1;
                    } else {
                        //otherwise use the properties
                        configuration.layers[lay] = MapImport.parseLayerConfig(alls[a][lay]);
                        configuration.layers[lay].id = id;
                        id = id + 1;
                    }
                }
            }
        }
        //now the layers configurations are stored in configuration.layers
        delete configuration.tilesLayers;
        delete configuration.pointsLayers;
        delete configuration.pixelsLayers;
        delete configuration.author;
        delete configuration.guideLayers;
        delete configuration.gridLayers;
        delete configuration.polygons;
        delete configuration.regions
        return configuration;
    }


    static parseLayerConfig(config) {
        config._type = 'tilesLayer';
        config._name = `new ${config.type}`;
        Util.setOne(config, 'authors', ['author', 'AUTHORS', 'AUTHOR', 'auth', 'AUTH']);
        Util.setOne(config, 'name', ['NAME', 'title', 'TITLE', '_name']);
        Util.setOne(config, 'type', ['TYPE', 'layerType', 'layertype', '_type']);
        Util.setOne(config, 'source', ['SOURCE', 'Source']);
        Util.setOne(config, 'size', ['SIZE','Size', 'dim' ,'DIM','Dim']);
        config.alias = config.alias || config.name;
        config.attribution = config.attribution || '@gherardo.varando';


        if (config.type.includes('tilesLayer')) {
            config.tilesUrlTemplate = config.tilesUrlTemplate || '';
            if (config.tilesUrlTemplate.startsWith("http://") |
                config.tilesUrlTemplate.startsWith("file://") |
                config.tilesUrlTemplate.startsWith("https://")) {
                config.basePath = '';
            }
            if (config.tilesUrlTemplate.includes(config.basePath)){
              config.basePath = '';
            }
            config.maxZoom = Number(config.maxZoom || 0);
            config.minZoom = Number(config.minZoom || 0);
            config.maxNativeZoom = Number(config.maxNativeZoom || 0);
            config.minNativeZoom = Number(config.minNativeZoom || 0);
            config.errorTileUrl = config.errorTileUrl || '';
            config.noWrap = config.noWrap || true;
            config.zoomOffset = Number(config.zoomOffset || 0);
            config.zoomReverse = config.zoomReverse || false;
            config.opacity = Math.min(1,Math.max(0,Number(config.opacity || 1)));
            config.tileSize = Math.max(1,config.tileSize || 256);
            config.size = Math.max(1,Number(config.size ||  config.tileSize || 256));
            config.size_cal = config.size_cal || config.size || 256;

            if (Array.isArray(config.tileSize)) {
                config.bounds = config.bounds || [
                    [-Math.floor(Number(config.tileSize[1])), 0],
                    [0, Math.floor(Number(config.tileSize[0]))]
                ];
            } else if (typeof config.tileSize === 'number' || typeof config.tileSize === 'string') {
                config.bounds = config.bounds || [
                    [-Math.floor(config.tileSize) || -256, 0],
                    [0, Math.floor(config.tileSize) || 256]
                ];
            } else { // it is an object
                config.bounds = config.bounds || [
                    [-Math.floor(config.tileSize.x) || -256, 0],
                    [0, Math.floor(config.tileSize.y) || 256]
                ]
            }
        }
        if (config.type.includes('pointsLayer')) {

        }
        if (config.type.includes('guideLayer')) {

        }
        if (config.type.includes('gridLayer')) {

        }
        if (config.type.includes('imageLayer')) {

        }
        if (config.type.includes('drawnPolygons')) {

        }
        return config;
    }


}


module.exports = MapImport;
