/*!
 * Copyright (c) 2015-2021 Cisco Systems, Inc. See LICENSE file.
 */

const os = require('os');

const wrapHandler = require('../../lib/wrap-handler');
const {platformToShortName, prepareLocalProfile} = require('../../lib/openh264');

module.exports = {
  command: 'inject',
  desc: 'Creates the "safe" profile directory',
  builder: {},
  handler: wrapHandler(async () => {
    await prepareLocalProfile(platformToShortName(os.platform()));
  })
};
