/*!
 * Copyright (c) 2015-2021 Cisco Systems, Inc. See LICENSE file.
 */

const {promisify} = require('util');

const g = promisify(require('glob'));

const path = require('path');

const fs = require('fs-extra');

const _spawn = require('./spawn');

const cwd = 'packages/node_modules';

exports.list = async function list() {
  const packages = await g('**/package.json', {cwd});

  return packages.map((p) => path.dirname(p));
};

exports.glob = function glob(pattern, options = {}) {
  return g(pattern, Object.assign({}, options, {
    cwd: path.join(cwd, options.packageName)
  }));
};

/**
 * Reads a package.json into an object
 * @param {string} packageName
 * @returns {Promise<Object>}
 */
async function read(packageName) {
  const packagePath = path.join(cwd, packageName, 'package.json');

  return JSON.parse(await fs.readFile(packagePath));
}

exports.read = read;

/**
 * Writes an object to a package.json
 * @param {string} packageName
 * @param {Object} pkg
 */
async function write(packageName, pkg) {
  const packagePath = path.join(cwd, packageName, 'package.json');

  await fs.writeFile(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);
}

exports.write = write;

exports.getMain = async function getMain(packageName) {
  const pkg = await read(packageName);

  return pkg.main;
};

exports.setMain = async function setMain(packageName, main) {
  const pkg = await read(packageName);

  pkg.main = main;
  await write(packageName, pkg);
};

exports.spawn = async function spawn(packageName, cmd, args, options = {}) {
  return _spawn(cmd, args, Object.assign({
    cwd: path.join(cwd, packageName)
  }, options));
};
