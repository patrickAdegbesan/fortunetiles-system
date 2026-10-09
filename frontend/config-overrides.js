// Used only for the Android build (npm run build:mobile). The desktop build stays plain react-scripts.
// It lets the app bundle the SAME server code (backend/) and run it inside the web view.
const path = require('path');
const webpack = require('webpack');

const local = path.resolve(__dirname, 'mobile-runtime');
const backend = path.resolve(__dirname, '../backend');

module.exports = function override(config) {
  // Allow importing ../backend (outside src/).
  config.resolve.plugins = (config.resolve.plugins || []).filter((p) => p.constructor.name !== 'ModuleScopePlugin');

  config.resolve.alias = {
    ...config.resolve.alias,
    express$: path.join(local, 'shims/express.js'),
    jsonwebtoken$: path.join(local, 'shims/jsonwebtoken.js'),
    bcryptjs$: path.join(local, 'shims/bcryptjs.js'),
    sequelize$: path.resolve(__dirname, 'node_modules/sequelize'),
    // Only UTC is used, so the small timezone build is enough (saves ~700 KB of data to parse at start-up).
    'moment-timezone$': path.resolve(__dirname, 'node_modules/moment-timezone/builds/moment-timezone-with-data-10-year-range.min.js'),
  };
  // Backend files live outside this folder, so tell webpack where their dependencies are.
  config.resolve.modules = [path.resolve(__dirname, 'node_modules'), ...(config.resolve.modules || [])];

  config.resolve.fallback = {
    ...config.resolve.fallback,
    path: require.resolve('path-browserify'),
    util: require.resolve('util/'),
    buffer: require.resolve('buffer/'),
    events: require.resolve('events/'),
    stream: require.resolve('stream-browserify'),
    crypto: require.resolve('crypto-browserify'),
    os: require.resolve('os-browserify/browser'),
    process: require.resolve('process/browser.js'),
    fs: false,
    child_process: false,
    http: false,
    https: false,
    zlib: false,
    net: false,
    tls: false,
    url: false,
    vm: false,
    assert: require.resolve('assert/'),
    pg: false,
    'pg-hstore': false,
    mysql2: false,
    mariadb: false,
    tedious: false,
    sqlite3: false,
    oracledb: false,
  };

  config.plugins.push(
    new webpack.ProvidePlugin({ process: 'process/browser.js', Buffer: ['buffer', 'Buffer'] }),
    // Same route/model code, but pointed at the in-app database.
    new webpack.NormalModuleReplacementPlugin(/config[\\/]database(\.js)?$/, (resource) => {
      if (resource.context && resource.context.startsWith(backend)) resource.request = path.join(local, 'mobile-database.js');
    }),
    new webpack.NormalModuleReplacementPlugin(/^\.\.\/models$/, (resource) => {
      if (resource.context && (resource.context.startsWith(path.join(backend, 'routes')) || resource.context.startsWith(path.join(backend, 'middleware')))) {
        resource.request = path.join(local, 'mobile-models-index.js');
      }
    })
  );

  // CRA replaces `process.env` with a frozen literal; the server code reads values (JWT_SECRET) that the
  // app sets at run time, so only substitute the keys CRA itself needs.
  const define = config.plugins.find((p) => p.constructor.name === 'DefinePlugin');
  if (define && define.definitions && define.definitions['process.env']) {
    const env = define.definitions['process.env'];
    delete define.definitions['process.env'];
    Object.keys(env).forEach((k) => { define.definitions[`process.env.${k}`] = env[k]; });
  }

  config.ignoreWarnings = [...(config.ignoreWarnings || []), /Critical dependency/, /Failed to parse source map/];
  return config;
};
