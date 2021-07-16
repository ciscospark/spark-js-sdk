/*!
 * Copyright (c) 2015-2021 Cisco Systems, Inc. See LICENSE file.
 */

const wrapHandler = require('../../lib/wrap-handler');
const {last} = require('../../lib/version');

module.exports = {
  command: 'last',
  desc: 'Go to npm to read the highest published version of any package in the repo',
  builder: {},
  handler: wrapHandler(async () => {
    console.log(await last());
  })
};
