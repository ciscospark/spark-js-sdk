/*!
 * Copyright (c) 2015-2021 Cisco Systems, Inc. See LICENSE file.
 */

module.exports = {
  command: 'version',
  desc: 'Work with version',
  /**
   * Yargs builder
   * @param {Object} yargs
   * @returns {Object}
   */
  builder(yargs) {
    return yargs
      .demandCommand(1)
      .commandDir('./version');
  }
};
