#!/usr/bin/env node

const http = require('http');

async function main() {
  // Use offline sqlite for CI smoke tests (no external services)
  process.env.OFFLINE_MODE = '1';
  process.env.DB_DIALECT = 'sqlite';
  process.env.SQLITE_PATH = ':memory:';
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'ci_smoke_test_secret_change_me_32_chars';
  process.env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || 'http://localhost:3000';
  process.env.ENABLE_HSTS = 'false';

  const app = require('../app');
  const { sequelize } = require('../config/database');

  const server = http.createServer(app);

  const timeoutMs = 15000;
  const timeout = setTimeout(() => {
    // eslint-disable-next-line no-console
    console.error('❌ Smoke test timed out');
    process.exit(1);
  }, timeoutMs);

  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;

  try {
    const pingRes = await fetch(`${base}/api/ping`);
    if (!pingRes.ok) throw new Error(`/api/ping failed: ${pingRes.status}`);
    const ping = await pingRes.json();
    if (ping.message !== 'pong') throw new Error(`/api/ping unexpected response: ${JSON.stringify(ping)}`);

    const healthRes = await fetch(`${base}/api/health`);
    if (!healthRes.ok) throw new Error(`/api/health failed: ${healthRes.status}`);
    const health = await healthRes.json();
    if (health.status !== 'healthy') throw new Error(`/api/health unexpected response: ${JSON.stringify(health)}`);

    // eslint-disable-next-line no-console
    console.log('✅ Backend smoke test passed');
  } finally {
    clearTimeout(timeout);
    await new Promise((resolve) => server.close(resolve));
    try {
      await sequelize.close();
    } catch {
      // ignore
    }
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('❌ Smoke test failed:', err?.message || err);
  process.exit(1);
});

