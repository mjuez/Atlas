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
const Util = require('Util');
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
        _pointsLayersD: [],
        _pixelsLayers: [],
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
        _markers: [],


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

        setConfiguration: function(configuration, force) {
            if (configuration === this._configuration && !force) return;
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
            this._pixelsLayers = [];
            this._gridLayers = [];
            this._guideLayers = [];
            this._polygons = [];
            this._markers = [];
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
                //this.setIndex();
                this._indx = 0;
                if (this._configuration.layers) {
                    if (this._configuration.layers instanceof Array) {
                        this._configuration.layers.map((layer, index) => {
                            this.addLayer(layer);
                        });
                    } else { //we assume is an object
                        for (let a in this._configuration.layers) {
                            this.addLayer(this._configuration.layers[a]);
                        }
                    }
                }
                this._map.fitWorld();
            }
        },


        setIndex: function() {
            this._indx = 0;
            if (this._configuration) {
                if (this._configuration.layers) {
                    if (this._configuration.layers.drawnPolygons) {
                        this._indx = Math.max(this._indx, Math.max(...Object.keys(this._configuration.layers.drawnPolygons.polygons)) || 0);
                    }
                    if (this._configuration.layers.drawnMarkers) {
                        this._indx = Math.max(this._indx, Math.max(...Object.keys(this._configuration.layers.drawnMarkers.markers)) || 0);
                    }
                }
            }

        },

        getDrawingColor: function() {
            if (typeof this._configuration.drawingColor === 'string') return this._configuration.drawingColor;
            return "#ed8414";
        },

        setDrawingColor: function(color) {
            if (typeof color === 'string') this._configuration.drawingColor = color;
        },

        setMapOptions: function() {
            if (this._configuration) {
                this._configuration.minZoom = this._configuration.minZoom || 0;
                this._map.setMinZoom(this._configuration.minZoom);
                if (this._configuration.maxZoom) {
                    this._map.setMaxZoom(this._configuration.maxZoom);
                }
            }
        },

        getUnitCal: function() {
            let unit = "u";
            if (this._activeBaseLayer) {
                depth = this._activeBaseLayer._configuration.unitCal || depth;
            } else {
                let temp = this.getLayers('tilesLayer')[0];
                if (!temp) {
                    temp = this.getLayers('imageLayer')[0];
                }
                if (temp) {
                    size = temp._configuration.unitCal || depth;
                }
            }
            return depth;
        },

        getDepthCal: function() {
            let depth = 1;
            if (this._activeBaseLayer) {
                depth = this._activeBaseLayer._configuration.depthCal || depth;
            } else {
                let temp = this.getLayers('tilesLayer')[0];
                if (!temp) {
                    temp = this.getLayers('imageLayer')[0];
                }
                if (temp) {
                    size = temp._configuration.depthCal || depth;
                }
            }
            return depth;
        },

        getSize: function() { //this is the maximum of the 2 dimension
            let temp = this.getSizes();
            return Math.max(temp[0], temp[1]);
        },

        getSizeCal: function() {
            let temp = this.getSizesCal();
            return Math.max(temp[0], temp[1]);
        },


        getSizes: function() {
            let size = [256, 256];
            if (this._activeBaseLayer) {
                size = this._activeBaseLayer._configuration.size || this._activeBaseLayer._configuration.tileSize || 256;
            } else {
                let temp = this.getLayers('tilesLayer')[0];
                if (!temp) {
                    temp = this.getLayers('imageLayer')[0];
                }
                if (temp) {
                    size = temp._configuration.size || temp._configuration.tileSize || [256, 256];
                }
            }
            if (typeof size === 'number') {
                return [size, size];
            }
            if (size.x && size.y) {
                return [size.x, size.y];
            }
            if (Array.isArray(size)) {
                return (size);
            }
        },

        getSizesCal: function() {
            let size = [256, 256];
            if (this._activeBaseLayer) {
                size = this._activeBaseLayer._configuration.sizeCal || this._activeBaseLayer._configuration.tileSize || 256;
            } else {
                let temp = this.getLayers('tilesLayer')[0];
                if (!temp) {
                    temp = this.getLayers('imageLayer')[0];
                }
                if (temp) {
                    size = temp._configuration.sizeCal || temp._configuration.tileSize || [256, 256];
                }
            }
            if (typeof size === 'number') {
                return [size, size];
            }
            if (size.x && size.y) {
                return [size.x, size.y];
            }
            if (Array.isArray(size)) {
                return (size);
            }
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
                    case "pointsLayerD":
                        return this._pointsLayersD;
                        break;
                    case "pixelsLayer":
                        return this._pixelsLayers;
                        break;
                    case "guideLayer":
                        return this._guideLayers;
                        break;
                    case "drawnPolygons":
                        return this._configuration.drawnPolygons;
                        break;
                    case 'polygons':
                        return this._polygons;
                        break;
                    case 'markers':
                        return this._markers;
                        break;
                    default:
                        return null;

                }
            } else if (types === undefined || types === null || !types) {
                return this.getLayers(['tilesLayer', 'pointsLayer', 'pixelsLayer', 'guideLayer', 'drawnPolygons']);
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

        addLayer: function(layer) {
            switch (layer.type) {
                case 'tilesLayer':
                    this.addTilesLayer(layer);
                    break;
                case 'pointsLayer':
                    this.addPointsLayer(layer);
                    break;
                case 'pixelsLayer':
                    this.addPixelsLayer(layer);
                    break;
                case 'polygon':
                    this.addPolygon(layer);
                    break;
                case 'marker':
                    this.addMarker(layer);
                    break;
                case 'circleMarker':
                    this.addCircleMarker(layer);
                    break;
                case 'guideLayer':
                    this.addGuideLayer(layer);
                    break;
                case 'drawnPolygons':
                    this.addDrawnPolygons(layer);
                    break;
                case 'polygons':
                    this.addPolygons(layer);
                    break;
                case 'drawnMarkers':
                    this.addDrawnMarkers(layer);
                    break;
                case 'imageLayer':
                    this.addImageLayer(layer);
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
                    this.addMarker(layer, true);
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
                        this.removeMarker(layer, false);

                    }

                });
            });

            this._map.on('draw:edited', (e) => {
                let layers = e.layers;
                layers.eachLayer((layer) => {
                    this.editDrawnLayer(layer);
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


        addPolygon: function(layer, addToConfiguration, group) {
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
                    fillOpacity: lyjson.options.fillOpacity || lyjson.fillOpacity || 0.3
                });
            } else { //assume the layer is already a L.polygon
                lyjson = {
                    latlngs: layer.getLatLngs(),
                    name: `Region ${this._indx}`,
                    options: layer.options
                };
            }
            if (this._options.region.tooltip) {
                layer.bindTooltip(lyjson.name);
            }
            layer.group = group;
            if (group) {
                group.addLayer(layer);
            } else if (this._drawnItems) {
                this._drawnItems.addLayer(layer);

            } else {
                this._map.addLayer(layer);
            }
            if (addToConfiguration) {
                this._configuration.layers.drawnPolygons = this._configuration.layers.drawnPolygons || {
                    name: 'drawnPolygons',
                    type: 'drawnPolygons',
                    polygons: {}
                };
                this._configuration.layers.drawnPolygons.polygons[`${this._indx}`] = lyjson;
            }
            lyjson.id = this._indx;
            layer._id = lyjson.id;
            layer._configuration = lyjson;
            this._polygons.push(layer);
            this.fire('add:polygon', {
                layer: layer
            });
        },

        editDrawnLayer: function(layer) {
            if (layer.getLatLngs) {
                layer._configuration.latlngs = layer.getLatLngs();
            }
            if (layer.getLatLng) {
                layer._configuration.latlng = layer.getLatLng();
            }
        },

        addMarker: function(layer, addToConfiguration, group) {
            let lyjson = {};
            this._indx++;
            if (!layer.getLatLng) {
                lyjson = layer; //we assume layer is written in json format with at least a latlngs field
                lyjson.options = lyjson.options || {};
                lyjson.name = lyjson.name || `Marker ${this._indx}`;
                layer = L.marker(lyjson.latlng ||
                    lyjson.latLng ||
                    lyjson.point ||
                    lyjson.coordinate ||
                    lyjson.coord || [lyjson.lat || lyjson.y, lyjson.lang || lyjson.x]);
            } else { //assume the layer is already a L.marker
                lyjson = layer.configuration || {
                    latlng: layer.getLatLng(),
                    name: `Marker ${this._indx}`,
                    options: layer.options,
                };
            }
            layer.bindTooltip(lyjson.name);
            layer.group = group;
            if (group) {
                group.addLayer(layer);
            } else if (this._drawnItems) {
                this._drawnItems.addLayer(layer);
            } else {
                this._map.addLayer(layer);
            }
            if (addToConfiguration) {
                this._configuration.layers.drawnMarkers = this._configuration.layers.drawnMarkers || {
                    name: 'drawnMarkers',
                    type: 'drawnMarkers',
                    markers: {}
                };
                this._configuration.layers.drawnMarkers.markers[`${this._indx}`] = lyjson;
            }
            lyjson.id = lyjson.id || this._indx;
            layer._id = lyjson.id;
            layer._configuration = lyjson;
            this._markers.push(layer);
            this.fire('add:marker', {
                layer: layer
            });
        },

        removeMarker: function(marker, removeLayer) {
            if (removeLayer) {
                if (marker.group) {
                    marker.group.removeLayer(marker);
                } else if (this._drawnItems) {
                    this._drawnItems.removeLayer(marker);
                } else {
                    this._map.removeLayer(marker);
                }
            }

            this._markers.splice(this._markers.indexOf(marker), 1);
            if (marker.group) {
                delete marker.group._configuration.markers[marker._id];
            } else {
                delete this._configuration.layers.drawnMarkers.markers[`${marker._id}`];
            }
            this.fire('remove:marker', {
                layer: marker
            });
        },


        removePolygon: function(polygon, removeLayer) {
            if (removeLayer) {
                if (polygon.group) {
                    polygon.group.removeLayer(polygon);
                } else if (this._drawnItems) {
                    this._drawnItems.removeLayer(polygon);
                } else {
                    this._map.removeLayer(polygon);
                }
            }
            this.fire('remove:polygon', {
                layer: polygon
                //layerConfig: this._configuration.layers.drawnPolygons.polygons[`${polygon._id}`]
            });
            this._polygons.splice(this._polygons.indexOf(polygon), 1);
            if (polygon.group) {
                delete polygon.group._configuration.polygons[polygon._id];
            } else {
                delete this._configuration.layers.drawnPolygons.polygons[polygon._id];
            }

        },

        addDrawnMarkers: function(layerConfig) {
            if (Array.isArray(layerConfig.markers)) {
                layerConfig.markers.map((pol) => {
                    this.addMarker(pol);
                });
            } else { //assume is an object
                Object.keys(layerConfig.markers).map((key) => {
                    this.addMarker(layerConfig.markers[key]);
                });
            }

            this.fire('add:drawnmarkers', {
                layer: null,
                layerConfig: layerConfig
            });

        },

        addDrawnPolygons: function(layerConfig) {
            if (Array.isArray(layerConfig.polygons)) {
                layerConfig.polygons.map((pol) => {
                    pol.options.fillOpacity = 0.3;
                    this.addPolygon(pol);
                });
            } else { //assume is an object
                Object.keys(layerConfig.polygons).map((key) => {
                    layerConfig.polygons[key].options.fillOpacity = 0.3;
                    this.addPolygon(layerConfig.polygons[key]);
                });
            }

            this.fire('add:drawnpolygons', {
                layer: null,
                layerConfig: layerConfig
            });

        },

        addPolygons: function(layerConfig) {
            let group = L.layerGroup();
            group._configuration = layerConfig;
            if (Array.isArray(layerConfig.polygons)) {
                layerConfig.polygons.map((pol) => {
                    pol.options.fillOpacity = 0.3;
                    this.addPolygon(pol, false, group);
                });
            } else { //assume is an object
                Object.keys(layerConfig.polygons).map((key) => {
                    layerConfig.polygons[key].options.fillOpacity = 0.3;
                    this.addPolygon(layerConfig.polygons[key], false, group);
                });
            }
            if (this._layerControl) {
                this._layerControl.addOverlay(group, layerConfig.name);
            } else {
                group.addTo(this._map);
            }
            this.fire('add:polygons', {
                layer: group,
                layerConfig: layerConfig
            });
        },

        addPointsLayer: function(layer) {
            if (layer.pointsUrlTemplate) {
                this._pointsLayers.push(layer);

                layer.color = layer.color || this.getDrawingColor();


                layer.easyToDraw = layer.easyToDraw || false;
                if (!layer.easyToDraw) {
                    return;
                }
                // drawing part
                let markers = L.markerClusterGroup();
                layer.typeid = this._pointsLayersD.length;
                this._pointsLayersD.push(markers);

                markers.bindTooltip(layer.name);
                if (this._layerControl) {
                    this._layerControl.addOverlay(markers, layer.name);
                }
                let points = new pointsLayer(layer);
                let scale = points.configuration.size / this.getSize();
                points.count({
                    maxTiles: 10,
                    cl: (point) => {
                        point = [-point[1] / scale, point[0] / scale];
                        let mk = L.circleMarker(point, {
                            color: layer.color || this.getDrawingColor(),
                            radius: layer.radius || 3
                        });
                        markers.addLayer(mk);
                    },
                    error: (err) => {

                        //console.log(err);
                    }
                });
            }

        },

        addPixelsLayer: function(layer) {
            if (layer.pixelsUrlTemplate) {
                this._pixelsLayers.push(layer);
                if (!layer.easyToDraw) {
                    return;
                }
                // drawing part

            }

        },

        center() {
            this._map.setView([0, 0], 0);
        },


        getBaseLayer: function() {
            return this._activeBaseLayer || this._tilesLayers[0];

        },

        addGuideLayer: function(layerConfig) {
            if (!this.getBaseLayer()) return;
            layerConfig.name = layerConfig.name || 'Guide';
            let guideLayer = L.featureGroup();
            layerConfig.typeid = this._guideLayers.length;
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
                if (layerConfig.size) {
                    scale = layerConfig.size / this.getSize();
                    let tileSize = layerConfig.tileSize || layerConfig.size;
                    if (tileSize > 0 && layerConfig.size < 100 * tileSize) {
                        for (let i = 0; i <= layerConfig.size; i = i + tileSize) {
                            for (let j = 0; j <= layerConfig.size; j = j + tileSize) {
                                guideLayer.addLayer(L.circleMarker([-i / scale, j / scale], {
                                    radius: layerConfig.radius || 4,
                                    color: layerConfig.color || this.getDrawingColor()
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

        addImageLayer: function(layerConfig) {
            if (layerConfig.imageUrl) {
                let options = layerConfig.options || {
                    opacity: layerConfig.opacity || 1,
                };

                Object.keys(layerConfig).map((key) => { //copy all the attributes of layerConfig
                    options[key] = options[key] || layerConfig[key];
                });

                options.bounds = layerConfig.bounds || [
                    [-256, 0],
                    [0, 256]
                ];
                let layer = L.imageOverlay(basePath + options.imageUrl, options.bounds, options);
                layer._configuration = options;
                layer._configuration.typeid = this._imageLayers.length;
                this._imageLayers.push(layer);
                if (options.baseLayer) {
                    this._configuration.size = this._configuration.size || options.size;
                    this._activeBaseLayer = this._activeBaseLayer || layer;
                }
                //this._configuration.layers[key] = options; //save the new options

                if (this._layerControl) {
                    if (options.baseLayer) {
                        this._layerControl.addBaseLayer(layer, options.name);
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
                        this._layerControl.addOverlay(layer, options.name);
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


        addTilesLayer: function(layerConfig) {
            //create layer
            if (layerConfig.tilesUrlTemplate) {
                let options = {};
                Util.merge(options, layerConfig);
                if (Array.isArray(options.tileSize)) {
                    options.tileSize = L.point(options.tileSize[0], options.tileSize[1]);
                }
                if (options.tileSize.x && options.tileSize.y) {
                    options.tileSize = L.point(options.tileSize.x, options.tileSize.y);
                }


                let layer = L.tileLayer(options.tilesUrlTemplate, options);
                layer._configuration = layerConfig;
                layer._configuration.typeid = this._tilesLayers.length;
                this._tilesLayers.push(layer);


                if (this._layerControl) {
                    if (options.baseLayer) {
                        this._layerControl.addBaseLayer(layer, options.name);
                        layer.on("add", () => {
                            this._map.setMaxZoom(layerConfig.maxZoom);
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
                        this._layerControl.addOverlay(layer, options.name);
                    }
                } else {
                    this._map.addLayer(layer);
                }
                this._map.setView(options.view || [-100, 100], 0);
                this.fire('add:tileslayer', {
                    layer: layer,
                    layerConfig: layerConfig
                });

            }
        },

        tUP: function() {
            if (!this._activeBaseLayer) return;
            if (!this._activeBaseLayer.options.customKeys) return;
            if (this._activeBaseLayer.options.t >= 0 && this._activeBaseLayer.options.customKeys.t) {
                let val = this._activeBaseLayer.options.customKeys.t;
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
            if (!this._activeBaseLayer) return;
            if (!this._activeBaseLayer.options.customKeys) return;
            if (this._activeBaseLayer.options.t >= 0 && this._activeBaseLayer.options.customKeys.t) {
                let val = this._activeBaseLayer.options.customKeys.t;
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
