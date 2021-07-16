/*!
 * Copyright (c) 2015-2021 Cisco Systems, Inc. See LICENSE file.
 */

const debug = require('debug')('tooling:updated');
const _ = require('lodash');

const {listDependents} = require('./dependencies');
const {last} = require('./version');
const {diff} = require('./git');

/**
 * Lists all of the updated packages in the repo
 * @param {Object} options
 * @param {boolean=} options.dependents if true, also includes dependents of
 * updated packages
 * @param {boolean=} options.npm if true, compares to the last tag published to
 * npm instead of upstream/master
 * @returns {Promise<Array<string>>}
 */
exports.updated = async function updated({dependents, npm = !!process.env.CI}) {
  const tag = npm ? await last() : 'upstream/master';
  const changedPackages = _(await diff(tag))
    .map((d) => d.path)
    .filter()
    .map(fileToPackage)
    .uniq()
    .value();

  if (dependents) {
    let transitive = new Set([...changedPackages]);

    for (const packageName of changedPackages) {
      transitive = new Set([...transitive, ...await listDependents(packageName, {includeTransitive: true})]);
    }

    return Array.from(transitive);
  }

  return changedPackages;
};

/**
 * Determines the package to which a given file belongs. Includes the meta
 * packages "docs" and "tooling"
 * @param {string} d
 * @private
 * @returns {string}
 */
function fileToPackage(d) {
  debug(d);
  if (d.startsWith('packages/node_modules/')) {
    d = d.replace('packages/node_modules/', '');
    d = d.split('/');
    if (d[0].startsWith('@')) {
      return d.slice(0, 2).join('/');
    }

    return d[0];
  }

  if (d.startsWith('docs') || d.startsWith('documentation') || d.startsWith('.github') || d.endsWith('.md')) {
    return 'docs';
  }

  return 'tooling';
}
