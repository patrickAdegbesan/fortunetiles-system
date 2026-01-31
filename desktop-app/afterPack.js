const { spawn } = require('child_process');
const path = require('path');

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32', ...opts });
    p.on('exit', code => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(' ')} exited ${code}`))));
  });
}

exports.default = async function afterPack(context) {
  const { appOutDir, electronPlatformName } = context;
  const backendPath = path.join(appOutDir, 'resources', 'backend');

  console.log('[afterPack] Installing backend production deps at:', backendPath);
  try {
    await run('npm', ['ci', '--omit=dev'], { cwd: backendPath });
  } catch (e) {
    console.warn('[afterPack] npm ci failed for backend. The app may fall back to remote mode.', e.message);
  }

  // Rebuild sqlite3 for the packaged Electron runtime
  try {
    const electronVersion = context.packager.info._electronBuilderConfig.electronVersion || process.versions.electron;
    console.log('[afterPack] Rebuilding sqlite3 for Electron', electronVersion, 'on', electronPlatformName);
    await run('npx', ['electron-rebuild', '-f', '-w', 'sqlite3', '-v', electronVersion], { cwd: backendPath });
  } catch (e) {
    console.warn('[afterPack] electron-rebuild failed for sqlite3. If sqlite3 cannot load, app will use remote backend.', e.message);
  }
};
