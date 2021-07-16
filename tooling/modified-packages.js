/*!
 * Copyright (c) 2015-2021 Cisco Systems, Inc. See LICENSE file.
 */

const _ = require('lodash');
const yargs = require('yargs');

const {listDependents} = require('./lib/dependencies');
const {last} = require('./lib/version');
const {diff} = require('./lib/git');

const fileToPackage = (d) => {
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
};

/**
 * Lists all of the updated packages in the repo
 * @param {Object} options
 * @param {boolean=} options.dependents if true, also includes dependents of
 * updated packages
 * @param {boolean=} options.npm if true, compares to the last tag published to
 * npm instead of upstream/master
 * @returns {Promise<Array<string>>}
 */
const updated = async ({dependents, npm} = {}) => {
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

const modified = async (argv) => {
  let changedPackages = argv.integration ?
    await updated({dependents: true}) :
    await updated();

  changedPackages = changedPackages
    .filter((packageName) => !packageName.includes('samples'))
    .filter((packageName) => !packageName.includes('tooling'))
    .filter((packageName) => !packageName.includes('bin-'))
    .filter((packageName) => !packageName.includes('test-helper-'))
    .filter((packageName) => !packageName.includes('eslint-config'))
    .filter((packageName) => !packageName.includes('xunit-with-logs'))
    .filter((packageName) => !packageName.includes('docs'));

  console.log(argv.glob ?
    `packages/node_modules/{${changedPackages}}` :
    `${changedPackages.join(argv.singleLine ? ' ' : '\n')}`);
};

modified(
  yargs
    .options('i', {
      alias: 'integration',
      describe: 'Grab packages for integration environment',
      default: false,
      type: 'boolean'
    })
    .options('g', {
      alias: 'glob',
      describe: 'Modify reponse for CircleCI split testing',
      default: false,
      type: 'boolean'
    })
    .options('single-line', {
      alias: 'singleLine',
      describe: 'Log results in a single line',
      default: false,
      type: 'boolean'
    })
    .argv
);
