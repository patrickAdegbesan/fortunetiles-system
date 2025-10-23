const { Sequelize } = require('sequelize');
const config = require('../config/database');

const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  dialect: config.dialect,
  port: config.port,
  logging: false,
});

const tables = ['users', 'categories', 'products', 'inventory_logs', 'sales', 'sale_items', 'returns', 'return_items'];

async function checkSchema() {
  try {
    console.log('Checking database schema...');

    for (const table of tables) {
      console.log('=== ' + table.toUpperCase() + ' TABLE ===');
      try {
        const query = `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = '${table}' ORDER BY ordinal_position`;
        const [results] = await sequelize.query(query);

        if (results.length === 0) {
          console.log('Table not found');
          continue;
        }

        results.forEach(row => {
          console.log(`${row.column_name}: ${row.data_type}`);
        });
        console.log('');

      } catch (error) {
        console.log('Error: ' + error.message);
      }
    }

  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await sequelize.close();
  }
}

checkSchema();