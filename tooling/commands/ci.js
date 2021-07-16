/*!
 * Copyright (c) 2015-2021 Cisco Systems, Inc. See LICENSE file.
 */
const debug = require('debug')('tooling:test:command');

const {report} = require('../util/coverage');
const {updated} = require('../lib/updated');
const spawn = require('../util/spawn');
const wrapHandler = require('../lib/wrap-handler');

module.exports = {
  command: 'ci',
  desc: 'commands to run during ci',
  builder: {
    coverage: {
      description: 'Generate code coverage',
      default: true,
      type: 'boolean'
    },
    coverageReport: {
      description: 'Internal; when false, no report is generated',
      default: true,
      type: 'boolean'
    },
    github: {
      description: 'Run tests on modified packages for github check',
      default: false,
      type: 'boolean'
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
    }
  },
  handler: wrapHandler(async (argv) => {
    let packages = argv.integration ?
      await updated({dependents: true, npm: !!process.env.CI}) :
      await updated({npm: !!process.env.CI});

    packages = packages
      .filter((packageName) => !packageName.includes('samples'))
      .filter((packageName) => !packageName.includes('tooling'))
      .filter((packageName) => !packageName.includes('bin-'))
      .filter((packageName) => !packageName.includes('test-helper-'))
      .filter((packageName) => !packageName.includes('eslint-config'))
      .filter((packageName) => !packageName.includes('xunit-with-logs'))
      .filter((packageName) => !packageName.includes('docs'));

    console.log(`Testing packages:\n${packages.join('\n')}`);

    const [cmd, ...args] = `npm run test --silent -- --packages ${packages.join(' ')} ${
      argv.github ?
        '--unit --os mac --browsers chrome firefox' :
        '--browsers defaults'
    }`.split(' ');

    await spawn(cmd, args);

    if (process.env.COVERAGE || (argv.coverage && argv.coverageReport)) {
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
