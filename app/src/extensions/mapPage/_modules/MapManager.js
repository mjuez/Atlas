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
const leafelt = require('leaflet');
const leafeltEasyButton = require('leaflet-easybutton');
const leafletMarkerCluster = require('leaflet.markercluster');
//const pointsLayer = require(`./_modules/pointsLayer.js`);
const geometryUtil = require('leaflet-geometryutil');
const leafletDraw = require('leaflet-draw');
const snap = require(`leaflet-snap`);
const pointsLayer = require(`./pointsLayer`);
'use strict';



if (L != undefined) {
    L.MapManager = L.Evented.extend({

        _map: null,
        _indx: 0,
        _configuration: {},
        _tilesLayers: [],
        _pointsLayers: [],
        _gridLayers: [],
        _guideLayers: [],
        _imageLayers: [],
        _activeBaseLayer: null,
        _state: {
            baseLayerOn: false
        },
        _options: {
            drawControl: true,
            layerControl: true,
            region: {
                tooltip: true,
                onclick: () => {}
            }
        },
        _drawnPolygon: [],
        _drawnMarker: [],
        _polygons: [],


        setMap: function(map) {
            if (map) {
                this._map = map;
                this.fire("mapAdded", map);
            } else {
                throw {
                    type: "map error",
                    map: map
                };
            }

        },

        parse: function(configuration) {
            configuration.type = configuration.type || 'undefined';
            if (configuration.type.includes("map")) {
                return configuration;
            } else {
                throw 'ERROR: configuration json must have "type":"..map.." ';
            }

        },

        setConfiguration: function(configuration) {
            if (configuration === this._configuration) return;
            try {
                this._configuration = this.parse(configuration);
                this.reload();
            } catch (e) {
                throw e;
            }
        },


        setOptions: function(options) {
            if (!options) return;
            if (options.drawControl) {
                this._options.drawControl = options.drawControl;
            }

            if (options.layerControl) {
                this._options.layerControl = options.layerControl;
            }
        },

        initialize: function(map, options, configuration) {
            try {
                this.setMap(map);
                this.setOptions(options);
                this.setConfiguration(configuration || {
                    type: 'map'
                });
            } catch (e) {}

        },

        clean: function() {
            this._map.eachLayer((layer) => {
                this._map.removeLayer(layer);
            });
            if (this._drawControl) {
                this._map.removeControl(this._drawControl);
            }
            if (this._layerControl) {
                this._map.removeControl(this._layerControl);
            }
            this._map.off("draw:created");
            this._map.off("draw:edited");
            this._map.off("draw:deleted");
            this._map.off("draw:created");
            this._map.off("draw:drawstart");
            this._map.off("draw:drawstop");
            this._map.off("draw:editstart");
            this._map.off("draw:editstop");
            this._map.off("draw:deletestart");
            this._map.off("draw:deletestop");
            this._state.baseLayerOn = false;
            this._tilesLayers = [];
            this._imageLayers = [];
            this._pointsLayers = [];
            this._gridLayers = [];
            this._guideLayers = [];
            this._polygons = [];
            this._activeBaseLayer = null;

        },

        reload: function() {
            if (!this._map) {
                return;
            } else {
                this.clean();
                if (this._options.layerControl) {
                    this.addLayerControl();
                }
                if (this._options.drawControl) {
                    this.addDrawnItems();
                    this.addDrawControl();
                }
                this.setMapOptions();
                if (this._configuration.layers) {
                    if (this._configuration.layers instanceof Array) {
                        this._configuration.layers.map((layer, index) => {
                            this.addLayer(layer, index);
                        });
                    } else { //we assume is an object
                        for (let a in this._configuration.layers) {
                            this.addLayer(this._configuration.layers[a], a);
                        }
                    }
                }
                this._map.fitWorld();
            }
        },

        getDrawingColor: function() {
            if (typeof this._configuration.drawingColor === 'string') return this._configuration.drawingColor;
            return "#ed8414";
        },

        setDrawingColor: function(color) {
            if (typeof color === 'string') this._configuration.drawingColor = color;
        },

        setMapOptions() {
            if (this._configuration) {
                this._configuration.minZoom = this._configuration.minZoom || 0;
                this._map.setMinZoom(this._configuration.minZoom);
                if (this._configuration.maxZoom) {
                    this._map.setMaxZoom(this._configuration.maxZoom);
                }
            }
        },

        getSize() {
            let size = 256;
            if (this._activeBaseLayer) {
                size = this._activeBaseLayer._configuration.size || this._activeBaseLayer._configuration.tileSize || 256;
            } else {
                let temp = this.getLayers('tilesLayer')[0];
                if (!temp) {
                    temp = this.getLayers('imageLayer')[0];
                }
                if (temp) {
                    size = temp._configuration.size || temp._configuration.tileSize || 256;
                }
            }
            if (size.x && size.y) {
                return Math.max(size.x, size.y);
            }
            if (Array.isArray(size)) {
                return (Math.max(size));
            }
            return size;
        },

        getLayers: function(types) {
            if (Array.isArray(types)) {
                return types.map((t) => {
                    return this.getLayers(t);
                });
            } else if (typeof types === 'string') {
                switch (types) {
                    case "tilesLayer":
                        return this._tilesLayers;
                        break;
                    case "imageLayer":
                        return this._imageLayers;
                        break;
                    case "pointsLayer":
                        return this._pointsLayers;
                        break;
                    case "guideLayer":
                        return this._guideLayers;
                        break;
                    case "drawnPolygons":
                        return this._configuration.drawnPolygons;
                        break;
                    case 'polygon':
                        return this._polygons;
                        break;
                    default:
                        return null;

                }
            } else if (types === undefined || types === null || !types) {
                return this.getLayers(['tilesLayer', 'pointsLayer', 'guideLayer', 'drawnPolygons']);
            }

        },


        /**
         * compute the area of a polygon
         * code from http://www.mathopenref.com/coordpolygonarea2.html
         * original from http://alienryderflex.com/polygon_area/
         *  Public-domain function by Darel Rex Finley, 2006.
         * @param  {array of ltlng} coords array of the vertex of the polygon
         * @return {number}        area of the polygon
         */
        polygonArea: function(coords) {
            coords = coords[0]; //lealfet 1 uncomment this line
            coords = coords.map(function(ltlng) {
                return ([ltlng.lat, ltlng.lng])
            });
            var numPoints = coords.length;
            var area = 0; // Accumulates area in the loop
            var j = numPoints - 1; // The last vertex is the 'previous' one to the first

            for (var i = 0; i < numPoints; i++) {
                area = area + (coords[j][0] + coords[i][0]) * (coords[j][1] -
                    coords[i][1]);
                j = i; //j is previous vertex to i
            }
            return Math.abs(area / 2);
        },

        addLayer: function(layer, key) {
            switch (layer.type) {
                case 'tilesLayer':
                    this.addTilesLayer(layer, key);
                    break;
                case 'pointsLayer':
                    this.addPointsLayer(layer, key);
                    break;
                case 'polygon':
                    this.addPolygon(layer, key);
                    break;
                case 'marker':
                    this.addMarker(layer, key);
                    break;
                case 'circleMarker':
                    this.addCircleMarker(layer, key);
                    break;
                case 'gridPoints':
                    this.addGridPoints(layer, key);
                    break;
                case 'guideLayer':
                    this.addGuideLayer(layer, key);
                    break;
                case 'drawnPolygons':
                    this.addDrawnPolygons(layer, key);
                    break;
                case 'imageLayer':
                    this.addImageLayer(layer, key);
                    break;
                default:
                    return;
            }
        },

        addDrawnItems() {
            this._drawnItems = new L.FeatureGroup(); //where items are stored
            this._map.addLayer(this._drawnItems);
            if (this._layerControl) {
                this._layerControl.addOverlay(this._drawnItems, "Drawn Regions");
            }
        },


        addDrawControl() {
            if (!(this._drawnItems instanceof L.FeatureGroup)) {
                this.addDrawnItems();
            }
            let drawnItems = this._drawnItems;
            let drawControl = new L.Control.Draw({
                position: "bottomleft", //position of the control
                edit: {
                    featureGroup: drawnItems, //specifies where to store the items
                    edit: {},
                    remove: {}
                },
                draw: {
                    polyline: false,
                    circle: false,
                    marker: true,
                    rectangle: {
                        showArea: false
                    },
                    polygon: {
                        showArea: false,
                        allowIntersection: false
                    }
                }
            });
            this._drawControl = drawControl;
            this._map.addControl(drawControl);

            this._map.on('draw:created', (e) => {
                this._map.dragging.enable();
                let type = e.layerType,
                    layer = e.layer;

                if (type === 'marker') {
                    this.addMarker(layer);
                } else {
                    layer.setStyle({
                        color: this.getDrawingColor(),
                        fillColor: this.getDrawingColor(),
                    });
                    this.addPolygon(layer, true);
                }
            });

            // when items are removed
            this._map.on('draw:deleted', (e) => {
                var layers = e.layers;
                layers.eachLayer((layer) => {
                    if (layer.getLatLngs) {
                        this.removePolygon(layer, false);
                    } else {

                    }

                });
            });

            this._map.on('draw:drawstart', () => {
                this._map.dragging.disable();
            });

        },

        addLayerControl: function() {
            this._layerControl = L.control.layers(null, null, {
                position: "bottomleft",
                hideSingleBase: "true"
            });
            this._map.addControl(this._layerControl);
        },


        addPolygon: function(layer, addToConfiguration) {
            let lyjson = {};
            this._indx++;
            if (!layer.getLatLngs) {
                lyjson = layer; //we assume layer is written in json format with at least a latlngs field
                lyjson.options = lyjson.options || {};
                lyjson.name = lyjson.name || `Region ${this._indx}`;
                layer = L.polygon(lyjson.latlngs ||
                    lyjson.latLngs ||
                    lyjson.path ||
                    lyjson.points ||
                    lyjson.coordinates ||
                    lyjson.coords || [lyjson.lats || lyjson.y, lyjson.langs || lyjson.x]);
                layer.setStyle({
                    color: lyjson.options.color || lyjson.color || this.getDrawingColor(),
                    opacity: lyjson.options.opacity || lyjson.opacity || 1,
                    weight: lyjson.options.weight || lyjson.weight || 3,
                    fill: true,
                    fillColor: lyjson.options.fillColor || lyjson.fillColor || this.getDrawingColor(),
                    fillOpacity: lyjson.options.fillOpacity || lyjson.fillOpacity || 0.2
                });
            } else { //assume the layer is already a L.polygon
                lyjson = {
                    latlngs: layer.getLatLngs(),
                    name: `Region ${this._indx}`,
                    options: layer.options,
                };
            }

            if (this._options.region.tooltip) {
                layer.bindTooltip(lyjson.name);
            }

            if (this._drawnItems) {
                this._drawnItems.addLayer(layer);

            } else {
                this._map.addLayer(layer);
            }
            if (addToConfiguration) {
                this._configuration.layers.drawnPolygons = this._configuration.layers.drawnPolygons || {
                    type: 'drawnPolygons',
                    polygons: {}
                };
                this._configuration.layers.drawnPolygons.polygons[`${this._indx}`] = lyjson;
            }
            lyjson.id = lyjson.id || this._indx;
            layer._id = lyjson.id;
            layer._configuration = lyjson;
            this._polygons.push(layer);
            this.fire('add:polygon', {
                layer: layer
            });
        },

        addMarker: function(layer) {
            if (this._drawnItems) {} else {}
            this.fire('add:marker', {
                layer: layer,
                manager: this
            });
        },


        removePolygon: function(polygon, removeLayer) {
            if (removeLayer) {
                if (this._drawnItems) {
                    this._drawnItems.removeLayer(polygon);
                } else {
                    this._map.removeLayer(polygon);
                }
            }
            this.fire('remove:polygon', {
                layer: polygon
                    //layerConfig: this._configuration.layers.drawnPolygons.polygons[`${polygon._id}`]
            });
            delete this._configuration.layers.drawnPolygons.polygons[`${polygon._id}`];
            this._polygons.splice(this._polygons.indexOf(polygon), 1);
        },

        addPointsLayer: function(layer) {
            this._pointsLayers.push(layer);
            let basePath = this._configuration.basePath;
            layer.color = layer.color || this.getDrawingColor();
            if (layer.source === "remote") {
                if (layer.basePath.startsWith('http://')) {
                    basePath = layer.basePath;
                } else {
                    basePath = "";
                }
            }
            if (layer.basePath) {
                basePath = layer.basePath;
            }
            if (layer.pointsUrlTemplate.startsWith("http://") |
                layer.pointsUrlTemplate.startsWith("file://") |
                layer.pointsUrlTemplate.startsWith("ftp://")) {
                basePath = "";
            }
            if (layer.pointsUrlTemplate.includes(basePath)) basePath = '';
            layer.pointsUrlTemplate = `${basePath}${layer.pointsUrlTemplate}`;
            layer.easyToDraw = layer.easyToDraw || false;

            if (!layer.easyToDraw) {
                return;
            }
            // drawing part
            let markers = L.markerClusterGroup();
            if (this._layerControl) {
                this._layerControl.addOverlay(markers, layer.name);
            }
            let points = new pointsLayer(layer);
            let scale = points.configuration.size / this.getSize();

            points.countPoints({
                maxTiles: 10,
                cl: function(point) {
                    point = [-point[1] / scale, point[0] / scale];
                    let mk = L.circleMarker(point, {
                        color: layer.color || this.getDrawingColor
                    });
                    markers.addLayer(mk);
                },
                error: (err) => {
                    console.log(err);
                }
            });


        },

        addGuideLayer: function(layerConfig) {
            layerConfig.name = layerConfig.name || layerConfig.alias || layerConfig.Name || 'Guide';
            let guideLayer = L.featureGroup();
            this._guideLayers.push(guideLayer);
            guideLayer.on("add", () => {
                this._guideLayers.map((g) => {
                    if (g === guideLayer) return;
                    this._map.removeLayer(g);
                });

                this._drawControl.setDrawingOptions({
                    polyline: {
                        guideLayers: [guideLayer]
                    },
                    polygon: {
                        guideLayers: [guideLayer],
                        snapDistance: 5
                    },
                    rectangle: {
                        guideLayers: [guideLayer],
                        snapDistance: 5
                    }
                });
            });
            guideLayer.on("remove", () => {
                this._drawControl.setDrawingOptions({
                    polyline: {
                        guideLayers: null
                    },
                    polygon: {
                        guideLayers: null
                    },
                    rectangle: {
                        guideLayers: null
                    }
                });
            });
            if (layerConfig.points) {

            } else {
                let scale = 1;
                let baselayer = this._activeBaseLayer || this._tilesLayers[0];
                if (layerConfig.size && (baselayer.options || baselayer._configuration)) {
                    scale = layerConfig.size / (baselayer._configuration.size || baselayer.options.tileSize);
                    let tileSize = layerConfig.tileSize || layerConfig.size;
                    if (tileSize > 0) {
                        for (let i = 0; i <= layerConfig.size; i = i + layerConfig.tileSize) {
                            for (let j = 0; j <= layerConfig.size; j = j + layerConfig.tileSize) {
                                guideLayer.addLayer(L.circleMarker([-i / scale, j / scale], {
                                    radius: 4
                                }));
                            }
                        }
                    }
                }
            }

            this._layerControl.addOverlay(guideLayer, layerConfig.name);
            this.fire('add:guidelayer', {
                layer: guideLayer,
                layerConfig: layerConfig,
                manager: this
            });

        },

        addGridLayer: function(layerConfig) {

        },

        addDrawnPolygons: function(layerConfig) {
            if (Array.isArray(layerConfig.polygons)) {
                layerConfig.polygons.map((pol) => {
                    this.addPolygon(pol);
                });
            } else {
                Object.keys(layerConfig.polygons).map((key) => {
                    this.addPolygon(layerConfig.polygons[key]);
                });
            }

            this.fire('add:drawnpolygons', {
                layer: null,
                layerConfig: layerConfig,
                manager: this
            });

        },


        addImageLayer: function(layerConfig, key) {
            if (layerConfig.imageUrl) {
                let basePath = this._configuration.basePath;
                if (layerConfig.basePath) {
                    basePath = layerConfig.basePath;
                }
                if (layerConfig.imageUrl.startsWith("http://") |
                    layerConfig.imageUrl.startsWith("file://") |
                    layerConfig.imageUrl.startsWith("ftp://")) {
                    basePath = "";
                }
                if (!layerConfig.alias) {
                    layerConfig.alias = layerConfig.name;
                }
                let options = layerConfig.options || {
                    opacity: layerConfig.opacity || 1,
                };

                options.minZoom = options.minZoom || 0;
                options.maxZoom = options.maxZoom || 5;






                Object.keys(layerConfig).map((key) => { //copy all the attributes of layerConfig
                    options[key] = options[key] || layerConfig[key];
                });

                options.bounds = layerConfig.bounds || [
                    [-256, 0],
                    [0, 256]
                ];

                let layer = L.imageOverlay(basePath + options.imageUrl, options.bounds, options);
                layer._configuration = options;
                this._imageLayers.push(layer);
                if (options.baseLayer) {
                    this._configuration.size = this._configuration.size || options.size;
                    this._activeBaseLayer = this._activeBaseLayer || layer;
                }
                this._configuration.layers[key] = options; //save the new options

                if (this._layerControl) {
                    if (options.baseLayer) {
                        this._layerControl.addBaseLayer(layer, options.alias);
                        layer.on("add", () => {
                            this._map.setMaxZoom(options.maxZoom);
                            this._map.setMinZoom(options.minZoom);
                            this._activeBaseLayer = layer;
                        });
                        if (!this._state.baseLayerOn) {
                            this._map.addLayer(layer);
                            this._state.baseLayerOn = true;
                        }
                    } else {
                        this._layerControl.addOverlay(layer, options.alias);
                    }
                } else {
                    this._map.addLayer(layer);
                }
                this._map.setView(options.view || [-100, 100], 0);
                this.fire('add:imagelayer', {
                    layer: layer,
                    layerConfig: options
                });

            }

        },


        addTilesLayer: function(layerConfig, key) {
            //create layer
            if (layerConfig.tilesUrlTemplate) {
                let basePath = this._configuration.basePath;
                if (layerConfig.source === "remote") {
                    if (layerConfig.basePath.startsWith('http://')) {
                        basePath = layerConfig.basePath;
                    } else {
                        basePath = "";
                    }
                }
                if (layerConfig.basePath) {
                    basePath = layerConfig.basePath;
                }
                if (layerConfig.tilesUrlTemplate.startsWith("http://") |
                    layerConfig.tilesUrlTemplate.startsWith("file://") |
                    layerConfig.tilesUrlTemplate.startsWith("ftp://")) {
                    basePath = "";
                }
                if (!layerConfig.alias) {
                    layerConfig.alias = layerConfig.name;
                }

                let options = layerConfig.options || {
                    maxZoom: layerConfig.maxZoom || this._configuration.maxZoom || 5,
                    minZoom: layerConfig.minZoom || this._configuration.minZoom || 0,
                    maxNativeZoom: layerConfig.maxNativeZoom || layerConfig.maxZoom || this._configuration.maxZoom || 5,
                    minNativeZoom: layerConfig.minNativeZoom || layerConfig.minNativeZoom || this._configuration.minNativeZoom || 0,
                    errorTileUrl: layerConfig.errorTileUrl || this._configuration.errorTileUrl || '',
                    attribution: layerConfig.attribution || '@gherardo.varando',
                    continuousWorld: layerConfig.continuousWorld || false,
                    noWrap: layerConfig.noWrap || false,
                    zoomOffset: layerConfig.zoomOffset || 0,
                    zoomReverse: layerConfig.zoomReverse || false,
                    opacity: layerConfig.opacity || 1,
                    tileSize: layerConfig.tileSize || 256
                };

                if (layerConfig.maxNativeZoom === 0) {
                    options.maxNativeZoom = 0;
                }

                if (Array.isArray(options.tileSize)) {
                    options.tileSize = L.point(options.tileSize[0], options.tileSize[1]);
                }
                if (options.tileSize.x && options.tileSize.y) {
                    options.tileSize = L.point(options.tileSize.x, options.tileSize.y);
                }


                let src = (basePath + layerConfig.tilesUrlTemplate).replace('{x}', '0').replace('{y}', '0').replace('{z}', '0');


                try {
                    if (layerConfig.customKeys) {
                        options.customKeys = layerConfig.customKeys;
                        for (let k in layerConfig.customKeys) {
                            src = src.replace(`{${k}}`, `${layerConfig.customKeys[k][0]}`);
                            options[k] = `${layerConfig.customKeys[k][0]}`
                            options[`${k}Values`] = layerConfig.customKeys[k];
                        }
                    }
                } catch (e) {
                    throw e;
                }

                Object.keys(layerConfig).map((key) => { //copy all the attributes of layerConfig
                    options[key] = options[key] || layerConfig[key];
                });


                options.pathToFirstTiles = src;

                if (this._state.baseLayerOn && options.baseLayer) {
                    this._configuration.baseBounds = this._configuration.baseBounds || options.bounds;
                    if (this._configuration.baseBounds != options.bounds) return;
                }
                if (options.baseLayer) {
                    this._configuration.baseBounds = options.bounds;
                }
                let layer = L.tileLayer(basePath + options.tilesUrlTemplate, options);
                layer._configuration = options;
                this._tilesLayers.push(layer);
                // if (options.baseLayer) {
                //     this._configuration.size = this._configuration.size || options.size || options.tileSize;
                // }
                this._configuration.layers[key] = options; //save the new options

                if (this._layerControl) {
                    if (options.baseLayer) {
                        this._layerControl.addBaseLayer(layer, options.alias);
                        layer.on("add", () => {
                            this._activeBaseLayer = layer;
                            if (layer.options.customKeys) {
                                layer.unbindTooltip();
                                layer.bindTooltip(L.tooltip({
                                    direction: 'left'
                                }));
                                layer.setTooltipContent(`slice ${layer.options.t}`);
                                layer.openTooltip([0, 0]);
                            }
                        });
                        if (!this._state.baseLayerOn) {
                            this._map.addLayer(layer);
                            this._state.baseLayerOn = true;
                        }
                    } else {
                        this._layerControl.addOverlay(layer, options.alias);
                    }
                } else {
                    this._map.addLayer(layer);
                }
                this._map.setView(options.view || [-100, 100], 0);
                this.fire('add:tileslayer', {
                    layer: layer,
                    layerConfig: options
                });

            }
        },

        tUP: function() {
            if (this._activeBaseLayer.options.t >= 0 && this._activeBaseLayer.options.tValues) {
                let val = this._activeBaseLayer.options.tValues;
                let cur = this._activeBaseLayer.options.t;
                let pos = val.findIndex((e) => {
                    return (`${e}` === cur);
                });
                let next = Math.min(pos + 1, val.length - 1);
                if (`${val[next]}` === cur) return;
                this._activeBaseLayer.options.t = `${val[next]}`;
                this._activeBaseLayer.setTooltipContent(`slice ${val[next]}`);
                this._activeBaseLayer.redraw();
            }
        },

        tDOWN: function() {
            if (this._activeBaseLayer.options.tValues) {
                let val = this._activeBaseLayer.options.tValues;
                let cur = this._activeBaseLayer.options.t;
                let pos = val.findIndex((e) => {
                    return (`${e}` === cur);
                });
                let next = Math.max(pos - 1, 0);
                if (`${val[next]}` === cur) return;
                this._activeBaseLayer.options.t = `${val[next]}`;
                this._activeBaseLayer.setTooltipContent(`slice ${val[next]}`);
                this._activeBaseLayer.redraw();
            }
        }

    });

    L.mapManager = function(map, configuration) {
        return (new L.MapManager(map, configuration));
    }



    if (typeof module !== 'undefined' && module.exports) {
        module.exports = L.mapManager;
    }

}
