// Brings an existing database up to date with columns added after it was first created
// (new databases already get them from the models). Safe to run on every start.
const { ensureUsernames } = require('./usernames');

const NEW_COLUMNS = [
  ['products', 'pack_size', 'DECIMAL(12,4)'],
  ['products', 'pack_unit', 'VARCHAR(32)'],
  ['sale_items', 'sold_quantity', 'DECIMAL(12,4)'],
  ['sale_items', 'sold_unit', 'VARCHAR(32)'],
];

async function ensureSchemaUpdates(sequelize) {
  await ensureUsernames(sequelize);
  const qi = sequelize.getQueryInterface();
  const described = {};
  for (const [table, column, type] of NEW_COLUMNS) {
    described[table] = described[table] || (await qi.describeTable(table));
    if (!described[table][column]) await sequelize.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  }
}

module.exports = { ensureSchemaUpdates };
