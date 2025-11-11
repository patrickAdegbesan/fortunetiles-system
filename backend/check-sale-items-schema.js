const { sequelize } = require('./config/database');
const { SaleItem } = require('./models');

async function checkSchema() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Get table info
    const queryInterface = sequelize.getQueryInterface();
    const columns = await queryInterface.describeTable('sale_items');
    
    console.log('\n📋 sale_items table columns:');
    console.log('=====================================');
    Object.entries(columns).forEach(([name, info]) => {
      console.log(`${name}: ${info.type} ${info.allowNull ? 'NULL' : 'NOT NULL'}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkSchema();
