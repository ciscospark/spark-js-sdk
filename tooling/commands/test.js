/*!
 * Copyright (c) 2015-2021 Cisco Systems, Inc. See LICENSE file.
 */

/* eslint-disable complexity */

const debug = require('debug')('tooling:test:command');
const {flatten} = require('lodash');

const wrapHandler = require('../lib/wrap-handler');
const {testPackage} = require('../lib/test');
const {list} = require('../lib/package');
const spawn = require('../util/spawn');
const {report} = require('../util/coverage');
const {start, stop} = require('../util/server');
const {startProxies, stopProxies} = require('../util/proxies');

/**
 * Returns true if the given package should be tested in the browser.
 * (Some packages are intended for use only in Node.)
 * @param {Array} packages
 * @returns {Boolean}
 */
const shouldTestInBrowser = (packages) => !packages.includes('@webex/webex-server');

module.exports = {
  command: 'test',
  desc: 'Run the test suite',
  builder: {
    coverage: {
      description: 'Generate code coverage',
      default: false,
      type: 'boolean'
    },
    coverageReport: {
      description: 'Internal; when false, no report is generated',
      default: true,
      type: 'boolean'
    },
    xunit: {
      description: 'Generate xunit xml reports. Note: exit code will always be zero of reports are generated successfully, even if tests fail',
      default: false,
      type: 'boolean'
    },
    browser: {
      description: 'Run tests in browser( defaults to true if --node is not specified)',
      default: false,
      type: 'boolean'
    },
    browsers: {
      description: 'Run tests in specific browsers (defaults to ChromeHeadless and FirefoxHeadless)',
      type: 'array'
    },
    os: {
      description: 'Which OS you want tests to run on SauceLabs',
      type: 'array'
    },
    node: {
      description: 'Run tests in node (defaults to true if --browser is not specified)',
      default: false,
      type: 'boolean'
    },
    unit: {
      description: 'Run unit tests (defaults to true if --integration and --automation are not specified)',
      default: false,
      type: 'boolean'
    },
    integration: {
      description: 'Run integration tests (defaults to true if --unit and --automation are not specified)',
      default: false,
      type: 'boolean'
    },
    documentation: {
      description: 'Check source code for examples and run any containing assertions',
      default: false,
      type: 'boolean'
    },
    automation: {
      description: 'Run automation tests (defaults to true if --unit and --integration are not specified)',
      default: false,
      type: 'boolean'
    },
    grep: {
      description: 'Run a subset of tests',
      default: [],
      type: 'array'
    },
    packages: {
      description: 'Run a set of packages',
      type: 'array'
    },
    karmaDebug: {
      description: 'Start karma in watch mode',
      default: false,
      type: 'boolean'
    },
    serve: {
      description: 'Start the fixture server. Since this defaults to true, you find --no-serve useful',
      default: true,
      type: 'boolean'
    },
    tests: {
      description: 'Set to false to skip tests but do the other work that happens during a test run (e.g. generate the coverage report)',
      default: true,
      type: 'boolean'
    }
  },
  handler: wrapHandler(async (argv) => {
    if (!argv.browser && !argv.node) {
      argv.browser = argv.packages && shouldTestInBrowser(argv.packages) || true;
      argv.node = true;
    }

    if (
      !argv.unit &&
      !argv.integration &&
      !argv.automation &&
      !argv.documentation
    ) {
      argv.unit = true;
      argv.integration = true;
      argv.automation = true;
      argv.documentation = true;
    }

    if (
      argv.automation &&
      !argv.unit &&
      !argv.integration &&
      !argv.documentation
    ) argv.browser = false;

    if (argv.tests) {
      if (argv.package) {
        console.error('Please use `--packages` instead of `--package`');
        argv.packages = [argv.package];
      }
      if (argv.packages) {
        argv.packages = flatten(
          argv.packages.map((packageName) => (packageName.includes(',') ? packageName.toLowerCase().split(',') : packageName.toLowerCase()))
        );
        if (argv.serve) {
          debug('starting test server');
          await start();
          debug('started test server');
        }

        // Use HTTP "snapshots" instead of live network calls to test.
        if (argv.snapshots || argv.snapshot) {
          await startProxies();
        }

        for (const packageName of argv.packages) {
          if (packageName.includes('plugin-meetings')) argv.browser = true;
          await testPackage(argv, packageName);
        }

        await stopProxies();

        if (argv.serve) {
          debug('stopping test server');
          await stop();
          debug('stopped test server');
        }
      }
      else {
        const packages = await list();

        for (const packageName of packages) {
          const argString = Object.keys(argv).reduce((acc, key) => {
            const value = argv[key];

            if (typeof value === 'boolean') {
              acc += value ? ` --${key}` : ` --no-${key}`;
            }

            return acc;
          }, '');
          const [cmd, ...args] = `npm run test --silent -- --no-coverage-report --packages ${packageName}${argString}`.split(' ');

          await spawn(cmd, args);
        }
      }
    }

    if (argv.coverage && argv.coverageReport) {
      debug('generating overall coverage report');
      await report();
      debug('generated overall coverage report');
    }

    // eslint-disable-next-line no-underscore-dangle
    for (const handle of process._getActiveHandles()) {
      // unref any outstanding timers/sockets/streams/processes.
      handle.unref();
    }
  })
};
