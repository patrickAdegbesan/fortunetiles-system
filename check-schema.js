const { sequelize } = require('./config/database.js');

async function checkSchema() {
  try {
    console.log('Checking current database schema...\n');

    const [result] = await sequelize.query(
      "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position"
    );

    const tables = {};
    result.forEach(row => {
      if (!tables[row.table_name]) tables[row.table_name] = [];
      tables[row.table_name].push(row.column_name);
    });

    Object.keys(tables).sort().forEach(table => {
      console.log(`${table}:`);
      tables[table].forEach(col => console.log(`  - ${col}`));
      console.log('');
    });

    process.exit(0);
  } catch (error) {
    console.error('Error checking schema:', error);
    process.exit(1);
  }
}

checkSchema();