const { spawn } = require('child_process');
const path = require('path');

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32', ...opts });
    p.on('exit', code => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(' ')} exited ${code}`))));
  });
}

// Installs the backend's production dependencies for the TARGET platform, so a Windows app
// can be built from any computer. sqlite3 and usb ship N-API prebuilt binaries that work
// inside Electron without recompiling.
exports.default = async function afterPack(context) {
  const { appOutDir, electronPlatformName } = context;
  const backendPath = path.join(appOutDir, 'resources', 'backend');
  const arch = process.env.TARGET_ARCH || 'x64';

  console.log('[afterPack] Installing backend production deps for', electronPlatformName, arch);
  await run('npm', ['ci', '--omit=dev', '--no-audit', '--no-fund'], {
    cwd: backendPath,
    env: { ...process.env, npm_config_platform: electronPlatformName, npm_config_arch: arch }
  });
};
