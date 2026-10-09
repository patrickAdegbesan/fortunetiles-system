// Runs the backend's own end-to-end checks against the IN-APP implementation (Express stand-in +
// Sequelize over the SQLite bridge) inside Node, so the Android build is verified the same way as desktop.
const Module = require('module');
const path = require('path');

const backend = path.resolve(__dirname, '../../../backend');
const local = path.resolve(__dirname, '..');
const originalLoad = Module._load;

Module._load = function patched(request, parent, isMain) {
  const load = (p) => originalLoad.call(Module, p, parent, isMain);
  if (request === 'express') return load(path.join(local, 'shims/express.js'));
  if (request === 'jsonwebtoken') return load(path.join(local, 'shims/jsonwebtoken.js'));
  if (request === 'bcryptjs' && parent && !parent.filename.includes(path.join('src', 'local'))) return load(path.join(local, 'shims/bcryptjs.js'));
  if (request === 'sequelize') return load(path.join(backend, 'node_modules/sequelize'));
  if (request === 'sqlite3') return load(path.join(backend, 'node_modules/sqlite3'));
  if (request === 'bcryptjs') return load(path.join(backend, 'node_modules/bcryptjs'));
  if (request === 'bcryptjs/umd/index.js') return load(path.join(backend, 'node_modules/bcryptjs/umd/index.js'));
  if (parent && request === '../models' && parent.filename.startsWith(backend)) return load(path.join(local, 'mobile-models-index.js'));
  if (parent && /config\/database(\.js)?$/.test(request) && parent.filename.startsWith(backend)) return load(path.join(local, 'mobile-database.js'));
  return originalLoad.apply(Module, arguments);
};

process.env.JWT_SECRET = 'harness-secret';
process.env.NODE_ENV = 'production';

(async () => {
  const { createNodeDriver } = require('../drivers/node-driver');
  const { driverRef } = require('../sqlite3-bridge');
  driverRef.current = createNodeDriver(process.env.HARNESS_DB || ':memory:');

  const { initLocalBackend } = require('../init');
  const { handle } = require('../app');
  const PASSWORD = 'HarnessAdmin1';
  await initLocalBackend({ adminPassword: PASSWORD });

  // Route fetch() calls from the shared test file into the in-app router.
  global.fetch = async (url, init = {}) => {
    const u = new URL(url);
    const body = init.body ? JSON.parse(init.body) : undefined;
    const out = await handle({ method: init.method || 'GET', url: u.pathname + u.search, body, headers: init.headers || {} });
    return {
      status: out.status,
      ok: out.status >= 200 && out.status < 300,
      headers: { get: (n) => out.headers[String(n).toLowerCase()] || null },
      json: async () => out.data,
      text: async () => (typeof out.data === 'string' ? out.data : JSON.stringify(out.data)),
    };
  };

  process.argv[2] = 'http://local';
  process.argv[3] = PASSWORD;
  require('../../../backend/tests/e2e.js');
})().catch((e) => { console.error('HARNESS CRASH', e); process.exit(2); });
