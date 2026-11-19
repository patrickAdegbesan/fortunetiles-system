const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { User } = require('./models');
const { dataDir } = require('./config/database');
const defaults = require('./config/localConfig').loadLocal('defaultAdmin');

// Guarantees a built-in owner account exists so the app can always be unlocked
// offline. If config/defaultAdmin.json holds a bcrypt hash (see
// `npm run admin:hash`) that password is used and no plaintext is ever stored.
// Otherwise a random one-time password is generated and written to the data
// folder so a fresh install is never locked out and never uses a known default.
async function ensureDefaultAdmin() {
  const existing = await User.findOne({ where: { email: defaults.email } });
  if (existing) {
    if (existing.role !== 'owner' || !existing.isActive) {
      existing.role = 'owner';
      existing.isActive = true;
      await existing.save({ hooks: false, validate: false });
    }
    return;
  }

  let passwordHash = defaults.passwordHash;
  if (!passwordHash) {
    const password = crypto.randomBytes(9).toString('base64url') + 'aA1!';
    passwordHash = await bcrypt.hash(password, 12);
    const notePath = path.join(dataDir, 'FIRST-RUN-ADMIN.txt');
    fs.writeFileSync(
      notePath,
      `Username: ${defaults.username}\nPassword: ${password}\n\nDelete this file after you have signed in and created your own users.\n`
    );
    console.log(`Default admin created. Credentials written to ${notePath}`);
  }

  // Bypass model hooks/validation: the hash is already computed.
  await User.create(
    {
      firstName: defaults.firstName,
      lastName: defaults.lastName,
      username: defaults.username,
      email: defaults.email,
      password: passwordHash,
      role: 'owner',
    },
    { hooks: false, validate: false }
  );
}

module.exports = { ensureDefaultAdmin };
