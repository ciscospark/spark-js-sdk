/*!
 * Copyright (c) 2015-2021 Cisco Systems, Inc. See LICENSE file.
 */

const wrapHandler = require('../../lib/wrap-handler');
const {next} = require('../../lib/version');

module.exports = {
  command: 'next',
  desc: 'Determine the next version',
  builder: {
    alwaysIncrement: {
      default: false,
      description: 'always increment patch version even of no changes detected',
      type: 'boolean'
    },
    includeSamples: {
      default: false,
      description: 'include the samples project for version calcuation',
      type: 'boolean'
    }
  },
  handler: wrapHandler(async ({alwaysIncrement, includeSamples}) => {
    // eslint-disable-next-line callback-return
    console.log(await next({alwaysIncrement, includeSamples}));
  })
};
