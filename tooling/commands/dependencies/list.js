/*!
 * Copyright (c) 2015-2021 Cisco Systems, Inc. See LICENSE file.
 */

const wrapHandler = require('../../lib/wrap-handler');
const {
  list,
  listDependents,
  listVersions
} = require('../../lib/dependencies');

module.exports = {
  command: 'list packageName',
  desc: 'list dependencies for the specified package',
  builder: {
    includeTransitive: {
      default: true,
      description: 'Also include subdependencies',
      type: 'boolean'
    },
    localOnly: {
      default: false,
      description: 'Only show the local dependencies and (optionally)  subdependencies',
      type: 'boolean'
    },
    versions: {
      default: false,
      description: 'Include dependency versions',
      type: 'boolean'
    },
    dependents: {
      default: false,
      description: 'Flip the list and find the packages a package depends on',
      type: 'boolean'
    }
  },
  handler: wrapHandler(async ({
    packageName, includeTransitive, localOnly, versions, dependents
  }) => {
    let deps;

    if (dependents) {
      deps = await listDependents(packageName, {includeTransitive});
    }
    else if (versions) {
      deps = await listVersions(packageName, {includeTransitive, localOnly});
    }
    else {
      deps = await list(packageName, {includeTransitive, localOnly});
    }

    console.log(Array.from(deps).sort());
  })
};
