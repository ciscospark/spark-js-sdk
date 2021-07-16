/*!
 * Copyright (c) 2015-2021 Cisco Systems, Inc. See LICENSE file.
 */

const debug = require('debug')('tooling:version');
const _ = require('lodash');

const {read, write} = require('../util/package');

const {getDistTag} = require('./npm');
const {list} = require('./package');
const {exec} = require('./async');
const updated = require('./updated');
const git = require('./git');

/* eslint-disable complexity */

/**
 * Recursive compareFunction for sorting version strings
 * @param {number} l
 * @param {Array<number>} left
 * @param {number} r
 * @param {Array<number>} right
 * @returns {number}
 */
function compare([l, ...left], [r, ...right]) {
  if (l < r) {
    return -1;
  }
  if (l > r) {
    return 1;
  }

  if (left.length === 0) {
    return 0;
  }

  return compare(left, right);
}

/**
 * Determines the latest published package version for the repo
 * @param {boolean} [includeSamples = false]
 * @returns {Promise<string>}
 */
exports.last = async function last(includeSamples = false) {
  const packages = Array.from(await list());
  const version = _(
    await Promise.all(packages
      // TODO stop omitting eslint config once it's fully removed from the repo
      .filter((p) => p !== '@webex/eslint-config')
      .map((v) => getDistTag({packageName: v, includeSamples})))
  )
    .filter()
    .map((v) => v.split('.').map((n) => parseInt(n, 10)))
    .sort(compare)
    .map((v) => v.join('.'))
    // TODO stop omitting v2 packages once the last once is unpublished
    .filter((v) => !v.startsWith('2.'))
    .last()
    .trim();

  const tag = `v${version}`;

  debug(`last version tag is ${version}`);

  return tag;
};

/**
 * Determines the current published package version for the repo
 * @returns {Promise<string>}
 */
exports.current = async function current() {
  return (await exports.last(true)).replace('v', '');
};

/**
 * Determines the next appropriate version to publish
 * @returns {Promise<string>}
 */
exports.next = async function next({alwaysIncrement, includeSamples}) {
  const version = await checkLastCommit();

  if (version) {
    debug(`found ${version} in last commit message`);

    return version.replace('v', '');
  }

  const currentVersion = (await exports.last(includeSamples)).replace('v', '');

  debug(`current version is ${currentVersion}`);

  if (await hasBreakingChange()) {
    debug('detected breaking changes');

    return increment('major', currentVersion);
  }

  debug('no breaking changes detected');

  const type = await getChangeType();

  if (!type) {
    debug('no changes to make');
    if (alwaysIncrement) {
      const nextVersion = increment('patch', currentVersion);

      debug(`next version is ${nextVersion}`);

      return nextVersion;
    }

    return currentVersion;
  }

  const nextVersion = increment(type, currentVersion);

  debug(`next version is ${nextVersion}`);

  return nextVersion;
};

exports.set = async function set(version, {all, lastLog}) {
  let ignoreTooling = false;

  if (lastLog) {
    const log = await git.lastLog();

    if (log.includes('#force-publish')) {
      all = true;
    }

    ignoreTooling = log.includes('#ignore-tooling');
  }

  // reminder, can't destructure updated because it's a circular dependency

  // First, get all the packages we should update
  let packages = Array.from(all ? await list() : await updated.updated({dependents: true}));

  // if we used updated() and it told us there's a tooling update, then there's
  // a chance we changed a dependency or build rule, so we need to republish
  // everything;
  if (!all && !ignoreTooling && packages.includes('tooling')) {
    all = true;
    packages = Array.from(await list());
  }
  // now, filter out the things that aren't really packages
  packages = packages.filter((p) => !['docs', 'legacy', 'tooling'].includes(p));

  if (packages.length === 0) {
    // eslint-disable-next-line no-console
    console.info('no packages to update');

    return;
  }

  for (const packageName of packages) {
    debug(`updating ${packageName} to ${version}`);
    try {
      const pkg = await read(packageName);

      debug(`${packageName} was at ${pkg.version}`);
      pkg.version = version;
      await write(packageName, pkg);
    }
    catch (err) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }
  }
};

/**
 * Determines if the last commit specified an explicit version to set
 * @returns {Promise<string>}
 */
async function checkLastCommit() {
  debug('checking if the last commit message has explicit release instructions');
  const summary = await git.lastLog();
  const re = /^#release v(\d+\.\d+\.\d+)/;
  const match = summary.match(re);

  if (match) {
    const version = match[1];

    if (version) {
      return version;
    }
  }

  return undefined;
}

/**
 * Determines if there are any breaking changes between HEAD and upstream/master
 * @returns {boolean}
 */
async function hasBreakingChange() {
  debug('checking for breaking changes between HEAD and upstream/master');
  const {stdout: bodies} = await exec('git log upstream/master.. --format=%b');

  if (/^BREAKING CHANGE:/.test(bodies)) {
    debug('found breaking change');

    return true;
  }
  debug('no breaking changes detected');

  return false;
}

/**
 * Checks commit messages to determine change type
 * @returns {Promise<boolean>}
 */
async function getChangeType() {
  const {stdout: subjects} = await exec('git log upstream/master.. --format=%s');

  for (const subject of subjects.split('\n')) {
    if (subject.startsWith('feat')) {
      return 'minor';
    }

    if (subject.startsWith('fix') || subject.startsWith('perf') || subject.startsWith('refactor')) {
      return 'patch';
    }
  }

  return undefined;
}

/* eslint-disable complexity */
/**
 * Increments a semver
 * @param {string} type
 * @param {string} version
 * @returns {string}
 */
function increment(type, version) {
  debug(`incrementing ${version} by ${type}`);

  let [major, minor, patch] = version
    .replace('v', '')
    .split('.')
    .map((v) => parseInt(v, 10));

  if (major === 0) {
    switch (type) {
      case 'major':
        minor += 1;
        patch = 0;
        break;
      case 'minor':
        patch += 1;
        break;
      case 'patch':
        patch += 1;
        break;
      default:
        throw new Error('unrecognized change type');
    }
  }
  else {
    switch (type) {
      case 'major':
        major += 1;
        minor = 0;
        patch = 0;
        break;
      case 'minor':
        minor += 1;
        patch = 0;
        break;
      case 'patch':
        patch += 1;
        break;
      default:
        throw new Error('unrecognized change type');
    }
  }

  return `${major}.${minor}.${patch}`;
}
