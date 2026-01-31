const fs = require('fs');
const path = require('path');

function rmrf(targetPath) {
  if (!fs.existsSync(targetPath)) return;
  fs.rmSync(targetPath, { recursive: true, force: true });
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyDir(srcDir, destDir) {
  ensureDir(destDir);
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const publicDir = path.join(repoRoot, 'public');

  const websiteDist = path.join(repoRoot, 'website', 'dist');
  const inventoryBuild = path.join(repoRoot, 'frontend', 'build');

  if (!fs.existsSync(websiteDist)) {
    throw new Error(`Missing website build output at ${websiteDist}. Did website build run?`);
  }
  if (!fs.existsSync(inventoryBuild)) {
    throw new Error(`Missing inventory build output at ${inventoryBuild}. Did frontend build run?`);
  }

  rmrf(publicDir);
  ensureDir(publicDir);

  // Website at /
  copyDir(websiteDist, publicDir);

  // Inventory at /inventory
  const inventoryDest = path.join(publicDir, 'inventory');
  copyDir(inventoryBuild, inventoryDest);

  // Optional: ensure favicon exists to avoid extra noise
  const websiteFavicon = path.join(publicDir, 'favicon.ico');
  const fallbackFavicon = path.join(publicDir, 'Favicon.jpeg');
  if (!fs.existsSync(websiteFavicon) && fs.existsSync(fallbackFavicon)) {
    // leave as jpeg; browsers will request favicon.ico but Vercel will 404 (ok)
  }

  console.log('✅ Copied static builds into public/');
}

main();
