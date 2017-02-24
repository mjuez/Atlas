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
const Modal = require('Modal');
const Input = require('Input');
const Grid = require('Grid');
const FolderSelector = require('FolderSelector');
const ButtonsContainer = require('ButtonsContainer');
const ChildProcess = require('child_process').ChildProcess;


class ConvertTask extends Task {
  constructor(details, options) {
      let name = "BioFormats Converter";
      super(name, details);
      this.bioFormats = gui.extensionsManager.extensions.bioFormats;
      this.childProcess = null;
      this.options = options;
  }


  run(){
    super.run();

  }


  modal(clb){
    let modal = new Modal({
        title: "BioFormats converter",
        height: "auto"
    });

    let grid = new Grid(3,2);


  }
}
