// Asks for the built-in admin password (hidden while typing) and stores only its bcrypt hash in
// config/defaultAdmin.json. Skips itself if a hash is already set. Run by START.bat on first setup.
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const bcrypt = require('bcryptjs');

const file = path.join(__dirname, '..', 'config', 'defaultAdmin.json');
const config = JSON.parse(fs.readFileSync(file, 'utf8'));
if (config.passwordHash) {
  console.log('Admin password is already set.');
  process.exit(0);
}


function ask(question) {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      const rl = readline.createInterface({ input: process.stdin });
      process.stdout.write(question);
      rl.once('line', (line) => { rl.close(); resolve(line); });
      return;
    }
    process.stdout.write(question);
    let value = '';
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.removeListener('data', onData);
          process.stdout.write('\n');
          return resolve(value);
        }
        if (ch === '\u0003') process.exit(1); // Ctrl+C
        if (ch === '\b' || ch === '\u007f') value = value.slice(0, -1);
        else value += ch;
      }
    };
    process.stdin.on('data', onData);
  });
}

(async () => {
  console.log('Choose the password for the built-in admin account (admin@fortunetiles.local).');
  console.log('At least 6 characters.');
  for (;;) {
    const first = await ask('Password: ');
    if (first.length < 6) {
      console.log('Too short (minimum 6 characters). Try again.\n');
      continue;
    }
    const second = await ask('Repeat password: ');
    if (first !== second) {
      console.log('Passwords did not match. Try again.\n');
      continue;
    }
    config.passwordHash = await bcrypt.hash(first, 12);
    fs.writeFileSync(file, JSON.stringify(config, null, 2) + '\n');
    console.log('Admin password saved (only a hash is stored). Write the password down somewhere safe.');
    process.exit(0);
  }
})();
