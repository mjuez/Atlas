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


const ProgressBar = require('ProgressBar');
const Task = require('Task');
const Util = require('Util');
const {
    fork
} = require('child_process');
const {
    ipcRenderer
} = require('electron');
const {
    ChildProcess
} = require('child_process');




class RegionAnalyzer {
    constructor(mapManager, gui) {
        this.mapManager = mapManager;
        this.gui = gui;
    }

    areaPx(polygon) {
        return this.mapManager.polygonArea(polygon.getLatLngs());
    }

    areaCal(polygon) {
        return this.areaPx(polygon) * (this.mapManager._configuration.size_cal * this.mapManager._configuration.size_cal) / (this.mapManager.getSize() * this.mapManager.getSize());
    }

    volumeCal(polygon) {
        return this.areaCal(polygon) * this.mapManager._configuration.depth_cal;
    }

    computeRegionStats(polygon) {
        polygon._configuration.stats = polygon._configuration.stats || {};
        polygon._configuration.stats.area_px = this.areaPx(polygon)
        polygon._configuration.stats.area_cal = this.areaCal(polygon);
        polygon._configuration.stats.volume_cal = polygon._configuration.stats.area_cal * this.mapManager._configuration.depth_cal;
        this.size = this.mapManager.getSize();

        this.mapManager.getLayers('pointsLayer').map((point) => {
            let task = new PointsCounting(polygon, point, this.size, this.gui);
            task.run((m) => {
                polygon._configuration.stats[point.name] = m.N;
                polygon._configuration.stats[`area_cal density ${point.name}`] = m.N / polygon._configuration.stats.area_cal;
                polygon._configuration.stats[`volume_cal density ${point.name}`] = m.N / polygon._configuration.stats.volume_cal;
                this.gui.notify(`${polygon._configuration.name} computed with ${point.name}, ${m.N} internal points counted in ${m.time[0]}.${m.time[1].toString()} seconds`);
                Util.notifyOS(`${polygon._configuration.name}: ${m.N} internal points from  ${point.name}`);
            });
        });

        this.mapManager.getLayers('pixelsLayer').map((pixel) => {
            let task = new PixelsCounting(polygon, pixel, this.size, this.gui);
            task.run((m) => {
                polygon._configuration.stats[`${pixel.name}_raw_sum`] = m.sum;
                this.gui.notify(`${polygon._configuration.name} computed with ${pixel.name}, ${m.sum} total summed in ${m.time[0]}.${m.time[1].toString()} seconds`);
                Util.notifyOS(`${polygon._configuration.name}: ${m.sum} internal pixels from  ${pixel.name}`);
            });


        });
    }

}


class PointsCounting extends Task {

    constructor(polygon, points, size, gui) {
        let name = `Points counting`;
        let details = `counting in ${polygon._configuration.name}  using ${points.name}`;
        `Points counting`;
        let scale = points.size / size;
        super(name, details, gui);
        this.polygon = extractPolygonArray(polygon.getLatLngs(), scale);;
        this.points = points;
    }

    run(callback) {
        super.run();
        let pol = this.polygon;
        let ch = fork(`${__dirname}/childCount.js`);
        ch.on('message', (m) => {
            switch (m.x) {
                case 'complete':
                    if (typeof callback === 'function') callback(m);
                    ch.kill();
                    this.taskManager.completeTask(this.id);
                    break;
                case 'step':
                    this.progressBar.setBar((m.prog / m.tot) * 100);
                    ipcRenderer.send('setProgress', {
                        value: (m.prog / m.tot)
                    });
                    this.gui.notify(`${(m.prog / m.tot)*100}%`);
                    break;
                case 'error':
                    this.gui.notify(m.error + "error");
                    ch.kill();
                    break;
                default:
                    null
            }
        });
        ch.send({
            job: 'points',
            polygon: pol,
            points: this.points
        });
        this.ch = ch;
    }

    cancel() {
        super.cancel();
        if (this.ch instanceof ChildProcess) {
            this.ch.kill();
        }
    }

    _createDOMElement() {
        super._createDOMElement();
        this.progressBar = new ProgressBar(this.customActions);
    }

    DOMActions() {
        let actions = super.DOMActions();
        // let buttonsContainer = new ButtonsContainer(document.createElement("DIV"));
        // buttonsContainer.addButton({
        //     id: "LoadMap00",
        //     text: "Load map to workspace",
        //     action: () => {
        //         MapIO.loadMap([this.jsonMap], (conf) => {
        //             this.gui.extensionsManager.extensions.mapPage.addNewMap(conf);
        //         });
        //     },
        //     className: "btn btn-large btn-positive"
        // });
        // actions.appendChild(buttonsContainer.element);
        return actions;
    }

}


class PixelsCounting extends Task {

    constructor(polygon, pixels, size, gui) {
        let name = `Pixels counting`;
        let details = `counting ${polygon._configuration.name} using ${pixels.name}`;
        let scale = pixels.size / size;
        super(name, details, gui);
        this.polygon = extractPolygonArray(polygon.getLatLngs(), scale);;
        this.pixels = pixels;
    }

    run(callback) {
        super.run();
        let scale = this.scale;
        let pol = this.polygon;
        let ch = fork(`${__dirname}/childCount.js`);
        ch.on('message', (m) => {
            switch (m.x) {
                case 'complete':
                    if (typeof callback === 'function') callback(m);
                    ch.kill();
                    this.taskManager.completeTask(this.id);
                    break;
                case 'step':
                    this.progressBar.setBar((m.prog / m.tot) * 100);
                    ipcRenderer.send('setProgress', {
                        value: (m.prog / m.tot)
                    });
                    this.gui.notify(`${(m.prog / m.tot)*100}%`);
                    break;
                case 'error':
                    this.gui.notify(m.error + "error");
                    ch.kill();
                    break;
                default:
                    null
            }
        });
        ch.send({
            job: 'pixels',
            polygon: pol,
            pixels: this.pixels
        });
        this.ch = ch;
    }

    cancel() {
        super.cancel();
        if (this.ch instanceof ChildProcess) {
            this.ch.kill();
        }
    }

    _createDOMElement() {
        super._createDOMElement();
        this.progressBar = new ProgressBar(this.customActions);
    }

}

function extractPolygonArray(polygon, scale) {
    if (!scale) {
        scale = 1;
    }
    //convert latlngs to a vector of coordinates
    var vs = polygon[0].map(function(ltlng) {
        return ([ltlng.lng * scale, -ltlng.lat * scale])
    });

    return vs;
}


module.exports = RegionAnalyzer;
