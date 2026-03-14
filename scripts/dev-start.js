const { spawn } = require('child_process');

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function start(label, args) {
  const child = spawn(npmCmd, args, {
    stdio: 'inherit',
    env: process.env,
    shell: false,
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      console.log(`[${label}] exited with signal ${signal}`);
      return;
    }
    console.log(`[${label}] exited with code ${code}`);
  });

  return child;
}

const backend = start('backend', ['run', 'backend']);
const frontend = start('frontend', ['run', 'frontend']);

function shutdown(signal) {
  console.log(`\nReceived ${signal}, shutting down...`);
  backend.kill(signal);
  frontend.kill(signal);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

let exiting = false;
function exitIfEitherDies() {
  if (exiting) return;
  exiting = true;
  frontend.kill('SIGTERM');
  backend.kill('SIGTERM');
  process.exit(1);
}

backend.on('exit', exitIfEitherDies);
frontend.on('exit', exitIfEitherDies);

