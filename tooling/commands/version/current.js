/*!
 * Copyright (c) 2015-2021 Cisco Systems, Inc. See LICENSE file.
 */

const wrapHandler = require('../../lib/wrap-handler');
const {current} = require('../../lib/version');

module.exports = {
  command: 'current',
  desc: 'Go to npm to read the current published version of any package in the repo',
  builder: {},
  handler: wrapHandler(async () => {
    console.log(await current());
  })
};
