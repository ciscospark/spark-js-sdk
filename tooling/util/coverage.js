/*!
 * Copyright (c) 2015-2021 Cisco Systems, Inc. See LICENSE file.
 */

/* eslint-disable require-jsdoc */

const {promisify} = require('util');
const path = require('path');

const g = promisify(require('glob'));
const debug = require('debug')('monorepo:test');
const fs = require('fs-extra');
const {Collector, Report} = require('istanbul');
const mkdirp = promisify(require('mkdirp'));
const rimraf = promisify(require('rimraf'));

const makeCoverageVariable = (packageName) =>
  `__coverage${packageName.replace(/@/g, '_').replace(/./g, '_').replace(/\//g, '_')}__`;


async function deinstrument(packageName) {
  await rimraf(path.join('packages/node_modules', packageName, '.coverage'));
}

async function collect(packageName) {
  debug(`collecting coverage for ${packageName}`);
  const coverage = global[makeCoverageVariable(packageName)];

  if (!coverage) {
    debug(`no coverage found for ${packageName}`);

    return;
  }

  const intermediatePath = `${process.cwd()}/reports/coverage/intermediate/${packageName}.json`;

  await mkdirp(path.dirname(intermediatePath));
  await fs.writeFile(intermediatePath, JSON.stringify(coverage, null, 2));
  debug(`stored intermediate coverage for ${packageName}`);
}

async function combine(packageName) {
  const collector = new Collector();
  const pattern = `reports/coverage/intermediate/${packageName}{.json,/**/*.json}`;
  const files = await g(pattern);

  for (const f of files) {
    collector.add(JSON.parse(await fs.readFile(f)));
  }

  // Summarize the coverage for just this package
  Report.create('text-summary').writeReport(collector, true);

  // Combine the mocha and karma reports into a single JSON file. We'll use this
  // file for generating the cobertura, lcov, and html reports later.
  Report.create('json', {
    file: `reports/coverage/${packageName}.json`
  }).writeReport(collector, true);

  debug(`removing intermediate report "reports/coverage/intermediate/${packageName}"`);
  await rimraf(`reports/coverage/intermediate/${packageName}{.json,/**/*.json}`);
}

async function report() {
  const collector = new Collector();
  const pattern = 'reports/coverage/**/*.json';

  const files = await g(pattern);

  for (const f of files) {
    collector.add(JSON.parse(await fs.readFile(f)));
  }

  Report.create('text-summary').writeReport(collector, true);

  Report.create('lcovonly', {
    file: 'reports/coverage/lcov.info'
  }).writeReport(collector, true);

  Report.create('cobertura', {
    file: 'reports/cobertura.xml'
  }).writeReport(collector, true);

  // The html report struggles with (I think) source maps, so let's make sure we
  // don't fail the build as a result
  try {
    Report.create('html').writeReport(collector, true);
  }
  catch (err) {
    // eslint-disable-next-line no-console
    console.warn('Failed to generate HTML report');
    // eslint-disable-next-line no-console
    console.warn(err);
  }
}

module.exports = {
  collect,
  combine,
  deinstrument,
  makeCoverageVariable,
  report
};
