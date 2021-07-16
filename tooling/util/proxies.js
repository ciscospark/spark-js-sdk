/*!
 * Copyright (c) 2015-2021 Cisco Systems, Inc. See LICENSE file.
 */

const crypto = require('crypto');
const http = require('http');
const path = require('path');
const url = require('url');

const yakbak = require('yakbak');

/**
 * A Cisco web service that we communicate with.
 * @typedef {Object} Service
 * @property {String} defaultUrl - The service's normal operating URL.
 * @property {String} env - The environment variable to set to override the service's URL.
 * @property {String} name - The friendly name of the service.
 * @property {number} port - The port on which to run the proxy server.
 */

// NOTE: CONVERSATION_SERVICE does not end in URL
const services = [
  {
    defaultUrl: 'https://atlas-a.wbx2.com/admin/api/v1',
    env: 'ATLAS_SERVICE_URL',
    name: 'atlas',
    port: 3010
  },
  {
    defaultUrl: 'https://conv-a.wbx2.com/conversation/api/v1',
    env: 'CONVERSATION_SERVICE',
    name: 'conversation',
    port: 3020
  },
  {
    defaultUrl: 'https://api.ciscospark.com/v1',
    env: 'HYDRA_SERVICE_URL',
    name: 'hydra',
    port: 3030
  },
  {
    defaultUrl: 'https://wdm-a.wbx2.com/wdm/api/v1',
    env: 'WDM_SERVICE_URL',
    name: 'wdm',
    port: 3040
  }
];

let proxies;

/**
 * Start yakbak proxy servers for each service
 * and return an array of those servers.
 * @returns {Promise}
 */
async function startProxies() {
  await Promise.all(services.map((service) => setEnv(service)));

  return Promise.all(services.map((service) => start(service)));
}

/**
 * Stop each of the proxy servers
 * in the given array.
 * @param {Array} proxies
 * @returns {Promise}
 */
async function stopProxies() {
  if (proxies && proxies.length) {
    return Promise.all(proxies.map((proxy) => stop(proxy)));
  }

  return Promise.resolve();
}

/**
 * Sets the process's environment variable given the service,
 * e.g., HYDRA_SERVICE_URL="http://localhost:3010"
 * @param {Service} service
 * @returns {Promise}
 */
async function setEnv(service) {
  return new Promise((resolve) => {
    process.env[service.env] = `http://localhost:${service.port}`;
    resolve();
  });
}

/**
 * Starts a proxy server for the given service.
 * @param {Service} service
 * @returns {Promise|http.server} proxy server
 */
async function start(service) {
  return new Promise((resolve) => {
    const snapshotsDir = path.join(__dirname, '../../test/services/', service.name, 'snapshots');
    const app = yakbak(service.defaultUrl, {
      dirname: snapshotsDir,
      hash: customHash
    });
    const proxy = http.createServer(app).listen(service.port, () => {
      console.log(`Yakbak server listening on port ${service.port}. Proxy for ${service.defaultUrl}`);
    });

    resolve(proxy);
  });
}

/**
 * Stops the given proxy server.
 * @param {http.server} proxy
 * @returns {http.server} proxy server
 */
async function stop(proxy) {
  return new Promise((resolve) => {
    proxy.close();
    resolve(proxy);
  });
}

/**
 * Creates a custom hash used as the snapshot's filename.
 * @param {http.ClientRequest} req
 * @param {Object} body
 * @returns {String} hashed filename
 */
function customHash(req, body) {
  const hash = crypto.createHash('md5');

  updateHash(hash, req);
  hash.write(body);

  return hash.digest('hex');
}

/**
 * Updates the given hash with the appropriate
 * methods, headers, etc.
 * @param {Hash} hash
 * @param {http.ClientRequest} req
 */
function updateHash(hash, req) {
  const parts = url.parse(req.url, true);
  const headers = pruneHeaders(req.headers);

  hash.update(req.httpVersion);
  hash.update(req.method);
  hash.update(parts.pathname);
  hash.update(JSON.stringify(sort(parts.query)));
  hash.update(JSON.stringify(sort(headers)));
  hash.update(JSON.stringify(sort(req.trailers)));
}

/**
 * Remove headers that are unique for each request
 * from the given headers object. This ensures
 * that certain headers do not "bust" the hash.
 * @param {Object} requestHeaders
 * @returns {Object} a new, pruned headers object
 */
function pruneHeaders(requestHeaders) {
  const headers = Object.assign({}, requestHeaders);

  delete headers.trackingid;
  delete headers.authorization;

  return headers;
}

/**
 * Sorts the given object.
 * @param {Object} obj
 * @returns {Object} a new, sorted object
 */
function sort(obj) {
  const ret = {};

  Object.keys(obj).sort().forEach((key) => {
    ret[key] = obj[key];
  });

  return ret;
}

module.exports = {
  startProxies,
  stopProxies
};
