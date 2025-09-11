const { sequelize } = require('../config/database');

async function fixTimestamps() {
  try {
    // Drop existing timestamp columns if they exist
    await sequelize.query(`
      ALTER TABLE products 
      DROP COLUMN IF EXISTS created_at,
      DROP COLUMN IF EXISTS updated_at;
    `);

    console.log('✅ Dropped existing timestamp columns');

    // Add the timestamp columns back with default values
    await sequelize.query(`
      ALTER TABLE products 
      ADD COLUMN created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;
    `);

    console.log('✅ Added new timestamp columns with defaults');

  } catch (error) {
    console.error('❌ Error fixing timestamps:', error);
    throw error;
  }
}

// Run the migration if this file is being executed directly
if (require.main === module) {
  fixTimestamps()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
} else {
  module.exports = fixTimestamps;
}
