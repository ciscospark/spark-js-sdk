/*!
 * Copyright (c) 2015-2021 Cisco Systems, Inc. See LICENSE file.
 */

const debug = require('debug')('tooling:npm');

const {read} = require('../util/package');

const {exec} = require('./async');

/**
 * Returns the dist-tag for the specified package
 * @param {object} options
 * @param {string} options.packageName
 * @param {bool} [options.includeSamples = false]
 * @private
 * @returns {Promise<string>}
 */
exports.getDistTag = async function getDistTag({packageName, includeSamples = false}) {
  let pkg;

  try {
    pkg = await read(packageName);
  }
  catch (err) {
    // Assume this is a not-yet-cleaned-up, removed package.
    if (err.code === 'ENOENT') {
      return undefined;
    }

    throw err;
  }

  if (!pkg.private) {
    debug(`fetching dist-tag for ${packageName}`);
    try {
      const {stdout: dt} = await exec(`npm dist-tag ls ${packageName}`);

      if (!dt) {
        debug(`no dist-tags found for ${packageName}`);

        return undefined;
      }
      const tags = dt
        .split('\n')
        .map((d) => d.split(':'))
        .reduce((acc, [tag, version]) => {
          acc[tag] = version;

          return acc;
        }, {});

      debug(`${packageName} is published as version ${tags.latest}`);

      return tags.latest;
    }
    catch (err) {
      debug('Something went wrong, but we had to use --silent, so it\'s hard to tell what', err);
    }
  }
  else if (includeSamples && packageName === 'samples') {
    return pkg.version;
  }

  return undefined;
};
