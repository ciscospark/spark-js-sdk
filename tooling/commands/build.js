/*!
 * Copyright (c) 2015-2021 Cisco Systems, Inc. See LICENSE file.
 */

const wrapHandler = require('../lib/wrap-handler');
const {list} = require('../util/package');
const {buildPackage, buildSamples, buildUMDScript} = require('../lib/build');

module.exports = {
  command: 'build [packageName]',
  desc: 'Build one or all packages',
  builder: {
    onlySamples: {
      default: false,
      description: 'Only build samples',
      type: 'boolean'
    },
    skipSamples: {
      default: false,
      description: 'Do not build samples',
      type: 'boolean'
    },
    umd: {
      default: false,
      description: 'build UMD script',
      type: 'boolean'
    }
  },
  handler: wrapHandler(async ({
    packageName,
    onlySamples,
    skipSamples,
    umd
  }) => {
    if (umd) {
      await buildUMDScript();
    }
    else {
      if (!onlySamples) {
        if (packageName) {
          await buildPackage(packageName);
        }
        else {
          for (const pName of await list()) {
            await buildPackage(pName);
          }
        }
      }

      if (!skipSamples) {
        if (!packageName) {
          await buildSamples();
        }
      }
    }
  })
};
