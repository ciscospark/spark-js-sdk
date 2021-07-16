/*!
 * Copyright (c) 2015-2021 Cisco Systems, Inc. See LICENSE file.
 */

const t = require('@babel/types');

const {version} = require('../package.json');

/**
 * Simple babel transform for ensuring that every WebexPlugin (and WebexCore)
 * have the correct version property
 * @returns {Object}
 */
module.exports = function injectPackageVersion() {
  return {
    visitor: {
      /**
       * Adds a version property to all SparkPlugins
       * @param {Object} path
       */
      CallExpression(path) {
        if (t.isMemberExpression(path.get('callee'))) {
          if (path.node.callee.object.name === 'WebexPlugin' && path.node.callee.property.name === 'extend') {
            const def = path.node.arguments[0];
            const visited = def.properties.reduce((acc, p) => acc || t.isObjectProperty(p, {key: 'version'}), false);

            if (!visited) {
              def.properties.push(t.objectProperty(
                t.identifier('version'),
                t.stringLiteral(version)
              ));
            }
          }
        }
      },
      /**
       * Replaces the PACKAGE_VERSION constant with the current version
       * @param {Object} path
       */
      Identifier(path) {
        if (path.node.name === 'PACKAGE_VERSION') {
          path.replaceWithSourceString(`\`${version}\``);
        }
      }
    }
  };
};
