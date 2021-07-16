/*!
 * Copyright (c) 2015-2021 Cisco Systems, Inc. See LICENSE file.
 */

/* eslint-disable require-jsdoc */
const debug = require('debug')('tooling:test');
const dotenv = require('dotenv');

dotenv.config();
dotenv.config({path: '.env.default'});

const {
  collect,
  combine
} = require('../../util/coverage');
const {glob} = require('../../util/package');

const {
  gatherFiles
} = require('./common');
const {test: mochaTest} = require('./mocha');
const {test: karmaTest} = require('./karma');

/* eslint-disable complexity */

exports.testPackage = async function testPackage(options, packageName) {
  // Move NODE_ENV override into the exported function since babel-node is processing everything above
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';

  const currentPackageString = `===== Testing ${packageName} =====`;

  console.info(`\n${'='.repeat(currentPackageString.length)}`);
  console.info(currentPackageString);
  console.info(`${'='.repeat(currentPackageString.length)}\n`);

  if (packageName === 'generator-ciscospark') {
    await runNodeSuite(packageName);

    return;
  }

  if (options.browser) {
    await runBrowserSuite(options, packageName);
  }

  if (options.automation) {
    await runAutomationSuite(options, packageName);
  }

  // Note: running docs test last because the babel transform interferes with
  // other test suites' test code. We should probably look at how to unload the
  // jsdoctrine transform once the doc tests complete.
  if (options.documentation) {
    await runDocsSuite(options, packageName);
  }

  if (options.coverage) {
    await collect(packageName);
    await combine(packageName);
  }
};

async function runDocsSuite(options, packageName) {
  debug(`Running documentation tests for ${packageName}`);
  const files = await glob('dist/**/*.js', {packageName});

  // eslint-disable-next-line global-require
  require(`${process.cwd()}/packages/node_modules/@webex/jsdoctrinetest`);
  await mochaTest(options, packageName, 'documentation', files.map((f) => `packages/node_modules/${packageName}/${f}`));
  debug(`Finished documentation suite for ${packageName}`);
}

async function runNodeSuite(options, packageName) {
  debug(`Running node suite for ${packageName}`);
  const files = await gatherFiles(options, packageName);

  if (files.length === 0) {
    debug(`no files found for ${packageName}`);

    return;
  }

  // Intercept require statements for the module under test and instead load the
  // instrumented files. This *should* continue to isolate code coverage since
  // we're running each package's test in a separate process, even when simply
  // running `npm test`.
  const load = require.extensions['.js'];

  if (options.coverage) {
    require.extensions['.js'] = function loadCoveredFile(m, filename) {
      if (filename.includes(packageName)) {
        filename = filename.replace(`${packageName}/dist`, `${packageName}/.coverage/src`);
      }

      return load(m, filename);
    };
  }

  await mochaTest(options, packageName, 'node', files);
  if (options.coverage) {
    require.extensions['.js'] = load;
  }

  debug(`Finished node suite for ${packageName}`);
}

async function runBrowserSuite(options, packageName) {
  debug(`Running browser suite for ${packageName}`);
  const files = await gatherFiles(options, packageName);

  if (files.length === 0) {
    debug(`no files found for ${packageName}`);

    return;
  }

  await karmaTest(options, packageName, files);

  debug(`Finished browser suite for ${packageName}`);
}

async function runAutomationSuite(options, packageName) {
  debug(`Running automation suite for ${packageName}`);
  const files = (await glob('test/automation/spec/**/*.js', {packageName}))
    .map((f) => `packages/node_modules/${packageName}/${f}`);

  if (files.length === 0) {
    debug(`no files found for ${packageName}`);

    return;
  }

  await mochaTest(options, packageName, 'automation', files);

  debug(`Finished automation suite for ${packageName}`);
}
