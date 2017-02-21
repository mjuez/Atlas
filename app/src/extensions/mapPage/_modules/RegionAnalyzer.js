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


const Task = require('Task');
const TaskManager = require('TaskManager');
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
const async = require('async');




class RegionAnalyzer {
    constructor(mapManager, gui) {
        this.mapManager = mapManager;
        this.gui = gui;
    }

    areaPx(polygon) {
        return this.mapManager.polygonArea(polygon.getLatLngs());
    }

    areaCal(polygon) {
        return this.areaPx(polygon) * (this.mapManager.getSizeCal() * this.mapManager.getSizeCal()) / (this.mapManager.getSize() * this.mapManager.getSize());
    }

    volumeCal(polygon) {
        return this.areaCal(polygon) * this.mapManager.getDepthCal();
    }





    computeRegionStats(polygon) {
        let area_px = this.areaPx(polygon);
        let areaCal = this.areaCal(polygon);
        let volumeCal = this.volumeCal(polygon);
        let size = this.mapManager.getSize();

        polygon._configuration.stats = polygon._configuration.stats || {};
        polygon._configuration.stats.area_px = area_px;
        polygon._configuration.stats[`area_cal_${this.mapManager.getUnitCal()}`] = areaCal;
        polygon._configuration.stats[`volume_cal_${this.mapManager.getUnitCal()}`] = volumeCal;
        let nTasks = 0;

        this.mapManager.getLayers('pointsLayer').map((point) => {
            nTasks++;
            let task = new PointsCounting(polygon, point, size, this.gui);
            TaskManager.addTask(task);
            task.run((m) => {
                polygon._configuration.stats[point.name] = m.N;
                polygon._configuration.stats[`area_cal_density_${point.name}`] = m.N / areaCal;
                polygon._configuration.stats[`volume_cal_density_${point.name}`] = m.N / volumeCal;
                this.gui.notify(`${polygon._configuration.name} computed with ${point.name}, ${m.N} internal points counted in ${m.time[0]}.${m.time[1].toString()} seconds`);
                Util.notifyOS(`${polygon._configuration.name}: ${m.N} internal points from  ${point.name}`);
                nTasks--;
                if (nTasks === 0) {
                    this.completeStats(polygon);
                }
            });
        });

        this.mapManager.getLayers('pixelsLayer').map((pixel) => {
            nTasks++;
            let task = new PixelsCounting(polygon, pixel, size, this.gui);
            TaskManager.addTask(task);
            task.run((m) => {
                polygon._configuration.stats[`${pixel.name}_${m.role}_sum_raw`] = m.sum;
                this.gui.notify(`${polygon._configuration.name} computed with ${pixel.name}, ${m.sum} total summed in ${m.time[0]}.${m.time[1].toString()} seconds`);
                Util.notifyOS(`${polygon._configuration.name}: ${m.sum} internal pixels from  ${pixel.name}`);
                nTasks--;
            });
        });
    }


    completeStats(polygon) {
        this.mapManager.getlayers('pixelsLayer').map((pixel) => {
            let stats = polygon._configuration.stats;
            switch (pixel.role) {
                case 'holes':

                    break;
                case 'area':

                    break;
                case 'volume':

                    break;
                case 'density':
                    break;
                default:

            }
            polygon._configuration.stats['']
        });
    }

}


class PointsCounting extends Task {

    constructor(polygon, points, size, gui) {
        let name = `Points counting`;
        let details = `Counting in ${polygon._configuration.name} using ${points.name}`;
        let scale = points.size / size;
        super(name, details, gui);
        this.polygon = extractPolygonArray(polygon.getLatLngs(), scale);
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
                    this.success();
                    break;
                case 'step':
                    this.updateProgress((m.prog / m.tot) * 100);
                    this.gui.notify(`${(m.prog / m.tot) * 100}%`);
                    break;
                case 'error':
                    this.fail(m.error + "error");
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
        this.childProcess = ch;
    }

    cancel() {
        if (super.cancel()) {
            if (this.childProcess instanceof ChildProcess) {
                this.childProcess.kill();
            }
            return true;
        }
        return false;
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
                    this.success();
                    break;
                case 'step':
                    this.updateProgress((m.prog / m.tot) * 100);
                    this.gui.notify(`${(m.prog / m.tot) * 100}%`);
                    break;
                case 'error':
                    this.fail(m.error + "error");
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
        this.childProcess = ch;
    }

    cancel() {
        if (super.cancel()) {
            if (this.childProcess instanceof ChildProcess) {
                this.childProcess.kill();
            }
            return true;
        }
        return false;
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
