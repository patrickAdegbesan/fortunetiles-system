// First-run setup for the in-app database: schema, default location/categories and the built-in admin.
const bcrypt = require('bcryptjs');
const defaults = require('../../backend/config/defaultAdmin.json');
const { ensureSchemaUpdates } = require('../../backend/utils/schemaUpdates');

// Bump when the schema changes. Tables that already exist are never altered by sync, so changes to them need a
// migration below (2: users.username; 3: products.pack_size/pack_unit, sale_items.sold_quantity/sold_unit).
const SCHEMA_VERSION = 3;

function randomPassword() {
  const bytes = new Uint8Array(9);
  (typeof crypto !== 'undefined' ? crypto : require('crypto').webcrypto).getRandomValues(bytes);
  let s = '';
  for (const b of bytes) s += 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 56];
  return s + '1!';
}

/**
 * Creates tables and default data. Returns { firstRunPassword } when it had to generate an admin
 * password (shown once on screen), otherwise {}.
 * options.adminPassword: use this password for the built-in admin instead of the configured hash.
 */
async function initLocalBackend(options = {}) {
  const { sequelize } = require('./mobile-database');
  const { User, Location, Category } = require('./mobile-models-index');

  const t0 = Date.now();
  const lap = (l) => console.log(`[startup]   ${l}: ${Date.now() - t0} ms`);
  await sequelize.query('PRAGMA foreign_keys = ON');

  // After the first launch everything already exists: skip creating tables and default data (saves ~2 s).
  const [pragma] = await sequelize.query('PRAGMA user_version');
  const version = pragma && pragma[0] ? Number(Object.values(pragma[0])[0]) : 0;
  if (version >= SCHEMA_VERSION && !options.force) {
    lap('already set up');
    return {};
  }

  await sequelize.sync();
  await ensureSchemaUpdates(sequelize);
  lap('sync');

  if ((await Location.count()) === 0) {
    await Location.create({ name: 'Main Warehouse', address: 'Default warehouse location' });
  }

  lap('location');
  const result = {};
  const existing = await User.findOne({ where: { email: defaults.email } });
  if (existing) {
    if (existing.role !== 'owner' || !existing.isActive) {
      existing.role = 'owner';
      existing.isActive = true;
      await existing.save({ hooks: false, validate: false });
    }
  } else {
    let passwordHash = options.adminPassword ? await bcrypt.hash(options.adminPassword, 10) : defaults.passwordHash;
    if (!passwordHash) {
      result.firstRunPassword = randomPassword();
      passwordHash = await bcrypt.hash(result.firstRunPassword, 10);
    }
    await User.create(
      { firstName: defaults.firstName, lastName: defaults.lastName, username: defaults.username, email: defaults.email, password: passwordHash, role: 'owner' },
      { hooks: false, validate: false }
    );
  }

  lap('admin');
  for (const name of ['General', 'Luxury', 'Premium', 'Marble', 'Granite', 'Ceramic', 'Porcelain', 'Travertine']) {
    await Category.findOrCreate({ where: { name }, defaults: { name } });
  }
  await sequelize.query(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  lap('categories');
  return result;
}

module.exports = { initLocalBackend };
