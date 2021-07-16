/*!
 * Copyright (c) 2015-2021 Cisco Systems, Inc. See LICENSE file.
 */

const debug = require('debug')('tooling:dependencies');
const builtins = require('builtins')();
const {values} = require('lodash');
const detective = require('detective');

const {read} = require('../util/package');

const path = require('path');
const fs = require('fs');

const _list = require('../lib/package').list;

/**
 * Lists the dependencies of a given package
 * @param {string} packageName
 * @param {boolean} [includeTransitive=true]
 * @param {boolean} [localOnly=false}]
 * @returns {Promise<Array<string>>}
 */
exports.list = async function list(packageName, {includeTransitive = true, localOnly = false}) {
  const packages = await _list();
  const pkg = await read(packageName);
  const entrypoints = await listEntryPoints(pkg);

  let deps = findDeps(entrypoints);
  const localDeps = Array.from(deps).filter((d) => packages.has(d));

  if (includeTransitive) {
    for (const dep of localDeps) {
      deps = new Set([...deps, ...findDeps(listEntryPoints(await read(dep)))]);
    }
  }

  if (localOnly) {
    return Array
      .from(deps)
      .filter((d) => packages.has(d))
      .sort();
  }

  return Array
    .from(deps)
    .sort();
};

const tree = new Map();

/**
 * Walks all packages to generate a tree of direct dependencies
 */
async function buildLocalDepTree() {
  for (const packageName of await _list()) {
    tree.set(packageName, await exports.list(packageName, {
      includeTransitive: false,
      localOnly: true
    }));
  }
}

exports.listDependents = async function listDependents(packageName, options = {}) {
  await buildLocalDepTree();

  const dependents = await buildDirectDependentTree();

  if (options.includeTransitive) {
    const deps = dependents.get(packageName);

    if (!deps) {
      return new Set();
    }
    let changed = true;

    while (changed) {
      changed = false;
      for (const dep of deps) {
        const next = dependents.get(dep);

        for (const nDep of next) {
          changed = changed || !deps.has(nDep);
          deps.add(nDep);
        }
      }
    }

    return deps;
  }

  return dependents.get(packageName);
};

/**
 * Builds a tree of direct dependent packages
 * @returns {Map<string, Set>}
 */
async function buildDirectDependentTree() {
  const dependents = new Map();

  for (const packageName of await _list()) {
    dependents.set(packageName, new Set());
  }

  for (const packageName of await _list()) {
    for (const dep of tree.get(packageName)) {
      dependents.get(dep).add(packageName);
    }
  }

  return dependents;
}

/**
 * Lists the dependencies of a given package (with versions)
 * @param {string} packageName
 * @param {Object} options
 * @returns {Promise<Object>}
 */
exports.listVersions = async function listVersions(packageName, options) {
  const deps = await exports.list(packageName, options);
  // eslint-disable-next-line global-require
  const pkg = require(path.resolve(process.cwd(), 'package.json'));

  return deps.reduce((acc, dep) => {
    acc[dep] = pkg.dependencies[dep] || pkg.devDependencies[dep] || pkg.optionalDependencies[dep];
    if (!acc[dep]) {
      try {
        // eslint-disable-next-line global-require
        acc[dep] = require(path.resolve(process.cwd(), `./packages/node_modules/${dep}/package.json`)).version;
      }
      catch (err) {
        // eslint-disable-next-line no-console
        debug(err);
        throw new Error(`Failed to determine version for ${dep}, Is it missing from package.json?`);
      }
    }

    return acc;
  }, {});
};

/**
 * Finds all the dependencies for a given set of entrypoints
 * @param {Array<string>} entrypoints
 * @returns {Array<string>}
 */
function findDeps(entrypoints) {
  let deps = new Set();

  for (const entrypoint of entrypoints) {
    deps = new Set([...deps, ...walk(entrypoint)]);
  }

  return deps;
}

/**
 * Translates a required filename into a package name
 * @param {strig} d
 * @returns {string}
 */
function requireToPackage(d) {
  d = d.split('/');
  if (d[0].startsWith('@')) {
    return d.slice(0, 2).join('/');
  }

  return d[0];
}

/**
 * Finds all the entrypoints for the specified package
 * @param {Object} pkg
 * @returns {Array<string>}
 */
function listEntryPoints(pkg) {
  debug(`listing entrypoints for ${pkg.name}`);
  if (!pkg.name) {
    throw new Error('cannot read dependencies for unnamed package');
  }
  let paths = [];

  if (pkg.main) {
    debug(`found main path for ${pkg.name}`);
    paths.push(pkg.main);
  }

  if (pkg.bin) {
    debug(`found bin entry(s) for ${pkg.name}`);
    paths = paths.concat(values(pkg.bin));
  }

  if (pkg.browser) {
    debug(`found browser entry(s) for ${pkg.name}`);
    paths = paths.concat(values(pkg.browser).filter((p) => p && !p.startsWith('@')));
  }

  debug(paths);

  return paths
    .map((p) => path.resolve('packages', 'node_modules', pkg.name, p));
}

const visited = new Map();

/**
 * Finds all dependencies of entrypoint
 * @param {string} entrypoint
 * @returns {Set<string>}
 */
function walk(entrypoint) {
  try {
    if (!visited.has(entrypoint)) {
      debug(`finding requires for ${entrypoint}`);
      // This whole thing is *way* easier if we do it synchronously
      // eslint-disable-next-line no-sync
      const requires = detective(fs.readFileSync(entrypoint));

      visited.set(entrypoint, requires.reduce((acc, dep) => {
        debug(`found ${dep}`);
        if (dep.startsWith('.')) {
          debug(`${dep} is relative, descending`);
          const next = walk(path.resolve(path.dirname(entrypoint), dep));

          acc = new Set([...acc, ...next]);
        }
        else if (!builtins.includes(dep)) {
          debug(`found dependency ${dep}`);
          acc.add(requireToPackage(dep));
        }

        return acc;
      }, new Set()));
    }

    return visited.get(entrypoint);
  }
  catch (err) {
    if (err.code === 'EISDIR') {
      return walk(path.resolve(entrypoint, 'index.js'));
    }
    if (err.code === 'ENOENT' && !entrypoint.endsWith('.js')) {
      return walk(`${entrypoint}.js`);
    }
    throw err;
  }
}
