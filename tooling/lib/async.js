/*!
 * Copyright (c) 2015-2021 Cisco Systems, Inc. See LICENSE file.
 */

const {promisify} = require('util');

exports.rimraf = promisify(require('rimraf'));
exports.glob = promisify(require('glob'));
exports.mkdirp = promisify(require('mkdirp'));
exports.transformFile = promisify(require('@babel/core').transformFile);
exports.exec = promisify(require('child_process').exec);
