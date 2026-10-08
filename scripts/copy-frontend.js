// Copies the built React app into backend/public, where the local server serves it from.
const fs = require('fs');
const path = require('path');

const from = path.join(__dirname, '..', 'frontend', 'build');
const to = path.join(__dirname, '..', 'backend', 'public');

if (!fs.existsSync(path.join(from, 'index.html'))) {
  console.error('frontend/build not found. Run "npm run build:frontend" first.');
  process.exit(1);
}
fs.rmSync(to, { recursive: true, force: true });
fs.cpSync(from, to, { recursive: true });
console.log(`Copied ${from} -> ${to}`);
