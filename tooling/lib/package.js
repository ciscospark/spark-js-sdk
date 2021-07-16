/*!
 * Copyright (c) 2015-2021 Cisco Systems, Inc. See LICENSE file.
 */

const _list = require('../util/package').list;

let packages;

exports.list = async function list() {
  if (!packages) {
    packages = new Set(await _list());
  }

  return packages;
};
