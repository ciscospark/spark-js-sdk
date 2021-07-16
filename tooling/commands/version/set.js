/*!
 * Copyright (c) 2015-2021 Cisco Systems, Inc. See LICENSE file.
 */

const wrapHandler = require('../../lib/wrap-handler');
const {set} = require('../../lib/version');

module.exports = {
  command: 'set version',
  desc: 'Set packages to the specified version',
  builder: {
    all: {
      default: false,
      type: 'boolean'
    },
    lastLog: {
      default: false,
      description: 'when set, check the last commit message to determin if which packages should be published',
      type: 'boolean'
    }
  },
  handler: wrapHandler(async ({all, version, lastLog}) => {
    await set(version, {all, lastLog});
  })
};
