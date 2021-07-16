/*!
 * Copyright (c) 2015-2021 Cisco Systems, Inc. See LICENSE file.
 */

const {updated} = require('../lib/updated');
const wrapHandler = require('../lib/wrap-handler');
const {list} = require('../util/package');
const {lastLog} = require('../lib/git');

module.exports = {
  command: 'list',
  desc: 'List packages',
  builder: {
    fortests: {
      default: false,
      description: 'list packages that should be tested in CI',
      type: 'boolean'
    },
    forpipeline: {
      default: false,
      description: 'list packages that should be tested in a pipeline gating job',
      type: 'boolean'
    }
  },
  // eslint-disable-next-line complexity
  handler: wrapHandler(async ({fortests, forpipeline}) => {
    let packages;

    if (fortests) {
      const changed = await updated({});
      const ignoreTooling = (await lastLog()).includes('#ignore-tooling');

      if (!ignoreTooling && changed.includes('tooling')) {
        packages = await list();
      }
      else {
        packages = await updated({dependents: true});
      }
    }
    else {
      packages = await list();
    }

    if (forpipeline || fortests) {
      packages = packages
        .filter((p) => !p.includes('bin-'))
        .filter((p) => !p.includes('test-helper-'))
        .filter((p) => !p.includes('eslint-config'))
        .filter((p) => !p.includes('xunit-with-logs'))
        .filter((p) => !p.includes('tooling'));

      // Make sure we always test the samples when the public sdk changes.
      if (packages.includes('webex') && !packages.includes('samples')) {
        packages.push('samples');
      }

      // this array is ranked in the order of approximate slowness. At this
      // time, that order is based on eyeballing some xml files rather than
      // empirical measurements of overall suite duration.
      const slow = [
        '@webex/internal-plugin-conversation',
        'ciscospark',
        '@webex/plugin-authorization-browser',
        'samples'
      ];

      packages.sort((a, b) => {
        const aIsSlow = slow.includes(a);
        const bIsSlow = slow.includes(b);

        if (aIsSlow === bIsSlow) {
          return slow.indexOf(a) - slow.indexOf(b);
        }

        if (aIsSlow) {
          return -1;
        }

        if (bIsSlow) {
          return 1;
        }

        return 0;
      });
    }

    for (const pkg of packages) {
      console.info(pkg);
    }
  })
};
