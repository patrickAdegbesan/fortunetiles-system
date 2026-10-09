// Staff sign in with a username. Databases created before usernames existed get the column added and every
// existing user a username taken from the start of their email (the built-in admin becomes "admin").
const USERNAME_RULE = /^[a-z0-9._-]{3,30}$/;

const slug = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9._-]+/g, '').slice(0, 26);

async function ensureUsernames(sequelize) {
  const columns = await sequelize.getQueryInterface().describeTable('users');
  if (!columns.username) await sequelize.query('ALTER TABLE users ADD COLUMN username VARCHAR(255)');

  const [taken] = await sequelize.query("SELECT username FROM users WHERE username IS NOT NULL AND username <> ''");
  const used = new Set(taken.map((r) => r.username));
  const [missing] = await sequelize.query("SELECT id, email FROM users WHERE username IS NULL OR username = ''");
  for (const row of missing) {
    let base = slug(String(row.email || '').split('@')[0]);
    if (base.length < 3) base = (base + 'user').slice(0, 8);
    let candidate = base;
    for (let n = 2; used.has(candidate); n += 1) candidate = `${base}${n}`;
    used.add(candidate);
    await sequelize.query('UPDATE users SET username = ? WHERE id = ?', { replacements: [candidate, row.id] });
  }
  await sequelize.query('CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique ON users (username)');
}

module.exports = { ensureUsernames, USERNAME_RULE };
