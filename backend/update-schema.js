const { sequelize } = require('./config/database');

async function updateSchema() {
  try {
    console.log('🔄 Synchronizing database schema...');
    
    // Force sync to update the database schema
    await sequelize.sync({ alter: true });
    
    console.log('✅ Database schema updated successfully!');
    
  } catch (error) {
    console.error('❌ Schema update failed:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

updateSchema()
  .then(() => {
    console.log('🎉 Schema update completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Update failed:', error);
    process.exit(1);
  });
