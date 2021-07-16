/*!
 * Copyright (c) 2015-2021 Cisco Systems, Inc. See LICENSE file.
 */

const os = require('os');
const path = require('path');
const {promisify} = require('util');

const debug = require('debug')('tooling:openh264');
const FirefoxProfile = require('firefox-profile');
const {stat} = require('fs-extra');

const spawn = require('../util/spawn');

const {rimraf} = require('./async');

const PROFILE_DIR = './.tmp/selenium';
const copy = promisify(FirefoxProfile.copy);

/**
 * denodeifies FirefoxProfile.encode
 * @param {FirefoxProfile} fp
 * @returns {Promise<string>}
 */
function encode(fp) {
  return new Promise((resolve, reject) => {
    fp.encode((err, encoded) => {
      if (err) {
        reject(err);

        return;
      }
      resolve(encoded);
    });
  });
}

/**
 * rsyncs a directory
 * @param {string} src
 * @param {string} dest
 */
async function rsync(src, dest) {
  await spawn('rsync', [
    '--recursive',
    '--delete',
    '--perms',
    src,
    dest
  ]);
}

/**
 * Determines if a given file/directory already exists
 * @param {string} dir
 * @returns {Promise<boolean>}
 */
async function exists(dir) {
  try {
    debug(`checking if ${dir} exists`);
    const s = await stat(dir);

    debug(`${dir} exists`);

    return s.isDirectory();
  }
  catch (err) {
    debug(`${dir} does not exist`);

    return false;
  }
}

/**
 * download
 */
async function download() {
  await rimraf(`${PROFILE_DIR}/mac`);
  await spawn(`${__dirname}/openh264.sh`, []);
}

/**
 * inject
 *
 * @param {array} browsers
 */
async function inject(browsers) {
  debug('checking if openh264 has been downloaded');
  if (!await exists(`${PROFILE_DIR}/mac`)) {
    debug('openh264 for mac not found, downloading');
    await download();
  }

  for (const key of Object.keys(browsers)) {
    const def = browsers[key];

    if (def.base === 'SauceLabs' || def['sauce:options']) {
      await injectSauce(def);
    }
    else {
      await injectLocal(def);
    }
  }
}

/**
 * Determines the switchabale platform name from a sauce definition or the
 * output of os.platform()
 * @param {string} platform
 * @returns {string}
 */
function platformToShortName(platform) {
  if (platform.toLowerCase().includes('mac') || platform === 'darwin') {
    return 'mac';
  }

  return undefined;
}

/**
 * Injects a the path of a firefox profile directory into a local browser definition
 * @param {Object} def
 */
async function injectLocal(def) {
  debug(`checking ${def.browserName} for firefox`);
  if (!def['sauce:options']) {
    debug('def is a firefox def');
    const platform = platformToShortName(os.platform());

    debug(`injecting ${platform} profile into ${def.browserName}`);
    const dest = await prepareLocalProfile(platform);

    def.profile = dest;
    debug(`injected ${dest} profile into ${def.browserName}`);
  }
}

/**
 * Prepares the local firefox profile directory for other tasks to reference it.
 * @param {string} platform
 * @returns {Promise}
 */
async function prepareLocalProfile(platform) {
  if (platform !== 'mac') {
    throw new Error(`No tooling implemented for injecting h264 into ${platform}`);
  }
  // Note: the `/` has to come outside path.resolve for rsync to behave as
  // intended
  const src = `${path.resolve(`${PROFILE_DIR}/${platform}`)}/`;
  const dest = path.resolve(`${PROFILE_DIR}/${platform}.safe`);

  debug(`rsyncing firefox profile at ${src} to ${dest}`);
  await rsync(src, dest);
  debug('done');

  return dest;
}

/**
 * Injects a gzipped, base64-encoded firefox profile directory into a Sauce Labs
 * browser definition
 * @param {Object} def
 */
async function injectSauce(def) {
  debug(`checking ${def.base} for firefox`);
  if (def.browserName.toLowerCase().includes('firefox')) {
    debug('def is a firefox def');
    const platform = platformToShortName(def.platformName);

    if (platform !== 'mac') {
      throw new Error(`No tooling implemented for injecting h264 into ${platform} (${def.platformName})`);
    }

    debug(`injecting ${platform} profile into ${def.browserName}`);
    const dir = path.resolve(process.cwd(), `${PROFILE_DIR}/${platform}`);

    debug(`profile is at ${dir}`);
    const profile = await copy(dir);
    const encoded = await encode(profile);

    // eslint-disable-next-line camelcase
    def['moz:firefoxOptions'].profile = encoded;
    debug(`injected ${platform} profile into def`);
  }
}

module.exports = {
  download,
  inject,
  platformToShortName,
  prepareLocalProfile
};
