/**
 * Test Database Connection and Validate Models
 * Run this before executing the full historical data seeder
 */

const { sequelize } = require('./config/database');
const models = require('./models');

async function testConnection() {
  try {
    console.log('🔌 Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connection successful');
    
    console.log('\n📋 Available models:');
    Object.keys(models).forEach(modelName => {
      if (modelName !== 'sequelize') {
        console.log(`  - ${modelName}`);
      }
    });
    
    console.log('\n🗄️ Testing model counts:');
    const locationCount = await models.Location.count();
    const userCount = await models.User.count();
    const productCount = await models.Product.count();
    const saleCount = await models.Sale.count();
    
    console.log(`  - Locations: ${locationCount}`);
    console.log(`  - Users: ${userCount}`);
    console.log(`  - Products: ${productCount}`);
    console.log(`  - Sales: ${saleCount}`);
    
    console.log('\n✅ Database test completed successfully!');
    console.log('🚀 You can now run the historical data seeder.');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.log('\n🔧 Troubleshooting steps:');
    console.log('1. Ensure PostgreSQL is running');
    console.log('2. Check your .env file configuration');
    console.log('3. Verify database exists and user has permissions');
    console.log('4. Run database migrations if needed');
  } finally {
    await sequelize.close();
  }
}

testConnection();