/*!
 * Copyright (c) 2015-2021 Cisco Systems, Inc. See LICENSE file.
 */

module.exports = function wrapHandler(fn) {
  return async function wrapper(...args) {
    try {
      await Reflect.apply(fn, null, args);
    }
    catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      // eslint-disable-next-line no-process-exit
      process.exit(64);
    }
  };
};
