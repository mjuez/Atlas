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
const Util = require('Util');
const {
    fork
} = require('child_process');
const {
    ipcRenderer
} = require('electron');



function computeRegionStats(polygon, gui, mapManager) {
    polygon._configuration.stats = polygon._configuration.stats || {};
    polygon._configuration.stats.area_px = mapManager.polygonArea(polygon.getLatLngs());
    polygon._configuration.stats.area_cal = polygon._configuration.stats.area_px * (mapManager._configuration.size_cal * mapManager._configuration.size_cal) / (mapManager.getSize() * mapManager.getSize());
    polygon._configuration.stats.volume_cal = polygon._configuration.stats.area_cal * mapManager._configuration.depth_cal;

    mapManager.getLayers('pointsLayer').map((point) => {
        let t = new Task(`${polygon._configuration.name} points counting`, `using ${point.name}`, gui);
        t.run();
        computePolygonPoint(polygon, point, mapManager.getSize(), (m) => {
            polygon._configuration.stats[point.name] = m.N;
            polygon._configuration.stats[`area_cal density ${point.name}`] = m.N / polygon._configuration.stats.area_cal;
            polygon._configuration.stats[`volume_cal density ${point.name}`] = m.N / polygon._configuration.stats.volume_cal;
            gui.notify(`${polygon._configuration.name} computed with ${point.name}, ${m.N} internal points counted in ${m.time[0]}.${m.time[1].toString()} seconds`);
            Util.notifyOS(`${polygon._configuration.name}: ${m.N} internal points from  ${point.name}`);
            t.completed = true;
            t.fire('complete');
        });
    });

    mapManager.getLayers('pixelsLayer').map((pixel) => {
        let t = new Task(`${polygon._configuration.name} pixels counting`, `using ${pixel.name}`, gui);
        t.run();
        computePolygonPixels(polygon, pixel, mapManager.getSize(), (m) => {
            polygon._configuration.stats[`${pixel.name}_raw_sum`] = m.sum;
            gui.notify(`${polygon._configuration.name} computed with ${pixel.name},  total summed in ${m.time[0]}.${m.time[1].toString()} seconds`);
            Util.notifyOS(`${polygon._configuration.name}: ${m.sum} internal pixels from  ${pixel.name}`);
            t.completed = true;
            t.fire('complete');
        });


    });
}


function computePolygonPoint(polygon, points, size, callback) {
    let scale = points.size / size;
    let pol = extractPolygonArray(polygon.getLatLngs(), scale);
    let ch = fork(`${__dirname}/childCount.js`);
    ch.on('message', (m) => {
        switch (m.x) {
            case 'complete':
                if (typeof callback === 'function') callback(m);
                ch.kill();
                break;
            case 'step':
                gui.header.progressBar.setBar((m.prog / m.tot) * 100);
                ipcRenderer.send('setProgress', {
                    value: (m.prog / m.tot)
                });
                gui.notify(`${(m.prog / m.tot)*100}%`);
                break;
            case 'error':
                gui.notify(m.error + "error");
                ch.kill();
                break;
            default:
                null
        }
    });
    ch.send({
        job: 'points',
        polygon: pol,
        points: points
    });
}

function computePolygonPixels(polygon, pixels, size, callback) {
    let scale = pixels.size / size;
    let pol = extractPolygonArray(polygon.getLatLngs(), scale);
    let ch = fork(`${__dirname}/childCount.js`);
    ch.on('message', (m) => {
        switch (m.x) {
            case 'complete':
                if (typeof callback === 'function') callback(m);
                ch.kill();
                break;
            case 'step':
                gui.header.progressBar.setBar((m.prog / m.tot) * 100);
                ipcRenderer.send('setProgress', {
                    value: (m.prog / m.tot)
                });
                gui.notify(`${(m.prog / m.tot)*100}%`);
                break;
            case 'error':
                gui.notify(m.error + "error");
                ch.kill();
                break;
            default:
                null
        }
    });
    ch.send({
        job: 'pixels',
        polygon: pol,
        pixels: pixels
    });
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


module.exports = computeRegionStats;
