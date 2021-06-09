const path = require('path');

const dotenv = require('dotenv');
const glob = require('glob');
const {BannerPlugin, DefinePlugin, EnvironmentPlugin} = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');

const {version} = require('./packages/node_modules/webex/package.json');

dotenv.config();
dotenv.config({path: '.env.default'});

/**
 * Webpack Config
 *
 * @param {object} [env]
 * @param {string} env.NODE_ENV
 * @returns {object}
 */
module.exports = (env = {NODE_ENV: process.env.NODE_ENV || 'production'}) => ({
  entry: env && env.NODE_ENV === 'development' ?
    `${path.resolve(__dirname)}/packages/node_modules/webex/src/index.js` :
    './packages/node_modules/webex',
  mode: env && env.NODE_ENV === 'development' ? 'development' : 'production',
  output: {
    filename: 'webex.min.js',
    library: 'Webex',
    libraryTarget: 'umd',
    sourceMapFilename: '[file].map',
    path: env && env.umd ?
      `${path.resolve(__dirname)}/packages/node_modules/webex/umd` :
      `${path.resolve(__dirname)}/packages/node_modules/samples`
  },
  devtool:
    'source-map',
  devServer: {
    https: true,
    port: 8000,
    static: './packages/node_modules/samples'
  },
  node: {
    fs: 'empty'
  },
  resolve: {
    alias: glob
      .sync('**/package.json', {cwd: './packages/node_modules'})
      .map((p) => path.dirname(p))
      .reduce((alias, packageName) => {
        // Always use src as the entry point for local files so that we have the
        // best opportunity for treeshaking; also makes developing easier since
        // we don't need to manually rebuild after changing code.
        alias[`./packages/node_modules/${packageName}`] = path.resolve(
          __dirname,
          `./packages/node_modules/${packageName}/src/index.js`
        );
        alias[`${packageName}`] = path.resolve(
          __dirname,
          `./packages/node_modules/${packageName}/src/index.js`
        );

        return alias;
      }, {})
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        include: /packages\/node_modules/,
        use: {
          loader: 'babel-loader'
        }
      }
    ]
  },
  ...(env !== 'development' && {
    optimization: {
      minimize: true,
      minimizer: [
        new TerserPlugin({
          cache: true,
          extractComments: false,
          parallel: true,
          sourceMap: true,
          terserOptions: {
            output: {
              preamble: `/*! Webex JS SDK v${process.env.VERSION || version} */`,
              comments: false
            }
          }
        })
      ]
    }
  }),
  plugins: [
    // If in integration and building for production (not testing) use production URLS
    ...(env && env.NODE_ENV === 'test' ?
      [
        // Environment Plugin doesn't override already defined Environment Variables (i.e. DotENV)
        new EnvironmentPlugin({
          WEBEX_LOG_LEVEL: 'log',
          DEBUG: '',
          NODE_ENV: 'production',
          // The following environment variables are specific to our continuous
          // integration process and should not be used in general
          ATLAS_SERVICE_URL: 'https://atlas-intb.ciscospark.com/admin/api/v1',
          CONVERSATION_SERVICE: 'https://conversation-intb.ciscospark.com/conversation/api/v1',
          ENCRYPTION_SERVICE_URL: 'https://encryption-intb.ciscospark.com/encryption/api/v1',
          HYDRA_SERVICE_URL: 'https://apialpha.ciscospark.com/v1/',
          IDBROKER_BASE_URL: 'https://idbrokerbts.webex.com',
          IDENTITY_BASE_URL: 'https://identitybts.webex.com',
          U2C_SERVICE_URL: 'https://u2c-intb.ciscospark.com/u2c/api/v1',
          WDM_SERVICE_URL: 'https://wdm-intb.ciscospark.com/wdm/api/v1',
          WHISTLER_API_SERVICE_URL: 'https://whistler.allnint.ciscospark.com/api/v1',
          WEBEX_CONVERSATION_DEFAULT_CLUSTER: 'urn:TEAM:us-east-1_int13:identityLookup'
        })
      ] : [
        new BannerPlugin({
          banner: `Webex JS SDK v${process.env.VERSION || version}`
        }),
        new EnvironmentPlugin({
          WEBEX_LOG_LEVEL: 'log',
          DEBUG: '',
          NODE_ENV: env && env.NODE_ENV === 'development' ? 'development' : 'production'
        }),
        // This allows overwriting of process.env
        new DefinePlugin({
          'process.env': {
            // Use production URLs with samples
            ATLAS_SERVICE_URL: JSON.stringify('https://atlas-a.wbx2.com/admin/api/v1'),
            CONVERSATION_SERVICE: JSON.stringify('https://conv-a.wbx2.com/conversation/api/v1'),
            ENCRYPTION_SERVICE_URL: JSON.stringify('https://encryption-a.wbx2.com'),
            HYDRA_SERVICE_URL: JSON.stringify('https://api.ciscospark.com/v1'),
            IDBROKER_BASE_URL: JSON.stringify('https://idbroker.webex.com'),
            IDENTITY_BASE_URL: JSON.stringify('https://identity.webex.com'),
            U2C_SERVICE_URL: JSON.stringify('https://u2c.wbx2.com/u2c/api/v1'),
            WDM_SERVICE_URL: JSON.stringify('https://wdm-a.wbx2.com/wdm/api/v1'),
            WHISTLER_API_SERVICE_URL: JSON.stringify(
              'https://whistler-prod.allnint.ciscospark.com/api/v1'
            )
          }
        })
      ]
    )
  ]
});
