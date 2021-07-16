/*!
 * Copyright (c) 2015-2021 Cisco Systems, Inc. See LICENSE file.
 */

const debug = require('debug')('monorepo:util');

const cp = require('child_process');

module.exports = function spawn(cmd, args, options) {
  return new Promise((resolve, reject) => {
    if (!cmd) {
      return reject(new Error('`cmd` is required'));
    }

    options = Object.assign({detached: false}, options);

    debug(`Running \`${cmd} ${args.join(' ')}\` in ${process.cwd()}`);
    const child = cp.spawn(cmd, args, Object.assign({stdio: 'inherit'}, options));

    let data = '';

    if (child.stderr) {
      child.stderr.on('data', (d) => {
        data += d;
      });
    }

    child.on('close', (code) => {
      debug('child has completed');
      if (code) {
        const e = new Error(code);

        e.data = data;

        return reject(e);
      }

      return resolve();
    });

    if (options && options.detached) {
      child.unref();
      /* eslint no-param-reassign: [0] */
      options.child = child;
    }

    return null;
  });
};
