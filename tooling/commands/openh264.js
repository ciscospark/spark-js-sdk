/*!
 * Copyright (c) 2015-2021 Cisco Systems, Inc. See LICENSE file.
 */

module.exports = {
  command: 'openh264',
  desc: 'Tasks for getting and using the open h264 codec in Firefox',
  /**
   * Yargs builder
   * @param {Object} yargs
   * @returns {Object}
   */
  builder(yargs) {
    return yargs
      .demandCommand(1)
      .commandDir('./openh264');
  }
};
