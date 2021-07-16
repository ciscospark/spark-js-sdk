/*!
 * Copyright (c) 2015-2021 Cisco Systems, Inc. See LICENSE file.
 */

const path = require('path');
const {spawn} = require('child_process');

const debug = require('debug')('tooling:build');
const capitalize = require('lodash');
const humanize = require('humanize-string');
const {writeFile} = require('fs-extra');

const {
  mkdirp,
  rimraf,
  transformFile
} = require('../lib/async');
const g = require('../lib/async').glob;
const {glob} = require('../util/package');

exports.buildFile = async function buildFile({src, dest}) {
  debug(`transforming ${src}`);
  const {code, map} = await transformFile(src);

  debug(`transformFileed ${src}`);
  await mkdirp(path.dirname(dest));
  debug(`writing ${dest}`);
  await writeFile(dest, `${code}\n//# sourceMappingURL=${path.basename(dest)}.map\n`);
  await writeFile(`${dest}.map`, JSON.stringify(map));
  debug(`wrote ${dest}`);
};

exports.buildPackage = async function buildPackage(packageName) {
  debug(`building package ${packageName}`);
  const files = await glob('src/**/*.js', {packageName});

  debug('building files ', files);
  const mapped = files
    .map((filename) => path.join('packages', 'node_modules', packageName, filename))
    .map((filename) => ({
      src: filename,
      dest: filename.replace('src', 'dist')
    }));

  for (const file of mapped) {
    await exports.buildFile(file);
  }
};

exports.buildSamples = async function buildSamples() {
  let data = '';

  await rimraf('packages/node_modules/samples/webex.min.*');

  // reminder: samples:build calls this script, not webpack
  // hence we must call webpack here
  const [cmd, ...args] = `webpack --color ${(process.env.NODE_ENV === 'development') ? '--mode development' : '--mode production'}`.split(' ');
  const webpack = spawn(cmd, args, {
    stdio: 'pipe',
    // Spawn fix for Windows
    shell: process.platform === 'win32'
  });

  webpack.stdout.on('data', (d) => {
    console.log(`webpack log:\n${d}`);
  });

  webpack.stderr.on('data', (d) => {
    data += d;
    console.log(`webpack log:\n${d}`);
  });

  webpack.on('close', (code) => {
    debug('child has completed');
    if (code) {
      const e = new Error(code);

      e.data = data;

      debug(e);
    }
  });

  const samples = await g('browser-*', {
    cwd: path.resolve(process.cwd(), 'packages/node_modules/samples')
  });

  const out = `<!DOCTYPE html>
<html>
<head>
  <title>Samples</title>
</head><body>
<h1>Hosted Samples</h1>
<ul>
${samples.map((s) => `<li><a href="${s}">${capitalize(humanize(s))}</a></li>`).join('\n')}
</ul>
</body>
</html>`;

  await writeFile('packages/node_modules/samples/index.html', out);
};

exports.buildUMDScript = async function buildUMDScript() {
  let data = '';

  await rimraf('packages/node_modules/webex/umd/webex*');

  // reminder: samples:build calls this script, not webpack
  // hence we must call webpack here
  const [cmd, ...args] = `webpack --color ${(process.env.NODE_ENV === 'development') ? '--mode development' : '--mode production'} --env umd`.split(' ');
  const webpack = spawn(cmd, args, {
    stdio: 'pipe',
    // Spawn fix for Windows
    shell: process.platform === 'win32'
  });

  webpack.stdout.on('data', (d) => {
    console.log(`webpack log:\n${d}`);
  });

  webpack.stderr.on('data', (d) => {
    data += d;
    console.log(`webpack log:\n${d}`);
  });

  webpack.on('close', (code) => {
    debug('child has completed');
    if (code) {
      const e = new Error(code);

      e.data = data;

      debug(e);
    }
  });
};
