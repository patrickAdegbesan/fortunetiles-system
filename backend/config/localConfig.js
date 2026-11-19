// Shop-specific settings live in JSON files in this folder that are not committed to git:
//   defaultAdmin.json   the built-in owner account (optional password hash)
//   sync.json           the cloud project URL and publishable key
//   bankAccounts.json   the shop's bank accounts, created on first run
// Each has a *.example.json next to it. When a file is missing, the defaults below are used.
const path = require('path');

const DEFAULTS = {
  defaultAdmin: { username: 'admin', email: 'admin@fortunetiles.local', firstName: 'System', lastName: 'Admin', passwordHash: '' },
  sync: { url: '', publishableKey: '', accountEmail: '' },
  bankAccounts: null, // bankAccounts.js supplies its own placeholder list
};

function loadLocal(name) {
  try {
    return require(path.join(__dirname, `${name}.json`));
  } catch (err) {
    if (err.code !== 'MODULE_NOT_FOUND') throw err; // a file that exists but is broken should fail loudly
    return DEFAULTS[name];
  }
}

module.exports = { loadLocal, localConfigPath: (name) => path.join(__dirname, `${name}.json`) };
