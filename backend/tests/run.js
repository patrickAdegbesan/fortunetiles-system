// Starts the real server on a temporary database and a free port, runs tests/e2e.js against it,
// then cleans up. Uses no network.
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const net = require('net');

function freePort() {
  return new Promise((resolve) => {
    const s = net.createServer().listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ft-test-'));
  const port = await freePort();
  const server = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
    env: { ...process.env, DATA_DIR: dir, PORT: String(port), NODE_ENV: 'production' },
    stdio: 'ignore',
  });
  const note = path.join(dir, 'FIRST-RUN-ADMIN.txt');
  for (let i = 0; i < 60 && !fs.existsSync(note); i++) await new Promise((r) => setTimeout(r, 250));
  await new Promise((r) => setTimeout(r, 500));
  const password = fs.readFileSync(note, 'utf8').match(/Password: (.+)/)[1].trim();
  const test = spawn(process.execPath, [path.join(__dirname, 'e2e.js'), `http://127.0.0.1:${port}`, password], { stdio: 'inherit' });
  test.on('exit', (code) => {
    server.kill();
    fs.rmSync(dir, { recursive: true, force: true });
    process.exit(code);
  });
})();
