const { sequelize } = require('./models');

async function checkSchema() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database');

    const tables = ['users', 'categories', 'products', 'sales', 'sale_items', 'returns', 'return_items', 'inventory', 'user_activities'];

    for (const table of tables) {
      try {
        const [result] = await sequelize.query(`SELECT column_name FROM information_schema.columns WHERE table_name = '${table}' ORDER BY ordinal_position`);
        console.log(`\n${table} table columns:`);
        result.forEach(col => console.log(` - ${col.column_name}`));
      } catch (err) {
        console.log(`\n${table} table: Error - ${err.message}`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkSchema();