const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

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

  if (electronPlatformName === 'win32') {
    const exePath = path.join(appOutDir, `${context.packager.appInfo.productFilename}.exe`);
    exports.setExeIcon(exePath, path.join(__dirname, 'assets', 'icon.ico'));
    console.log('[afterPack] Logo icon applied to', exePath);
  }
};

// Stamp the app logo onto the Windows .exe. electron-builder normally does this with
// Wine/rcedit, which is unavailable when building from Linux, so edit the resources directly.
exports.setExeIcon = function setExeIcon(exePath, icoPath) {
  const ResEdit = require('resedit');
  const exe = ResEdit.NtExecutable.from(fs.readFileSync(exePath));
  const res = ResEdit.NtExecutableResource.from(exe);
  const iconFile = ResEdit.Data.IconFile.from(fs.readFileSync(icoPath));
  const groups = ResEdit.Resource.IconGroupEntry.fromEntries(res.entries);
  const target = groups[0];
  ResEdit.Resource.IconGroupEntry.replaceIconsForResource(
    res.entries,
    target ? target.id : 1,
    target ? target.lang : 1033,
    iconFile.icons.map((i) => i.data)
  );
  res.outputResource(exe);
  fs.writeFileSync(exePath, Buffer.from(exe.generate()));
};
