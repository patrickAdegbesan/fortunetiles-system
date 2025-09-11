const { sequelize } = require('../config/database');

async function fixTimestamps() {
  try {
    // First, add the timestamp columns with a default value
    await sequelize.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    `);

    // Update any NULL values
    await sequelize.query(`
      UPDATE products 
      SET created_at = CURRENT_TIMESTAMP, 
          updated_at = CURRENT_TIMESTAMP 
      WHERE created_at IS NULL OR updated_at IS NULL;
    `);

    // Now make the columns NOT NULL
    await sequelize.query(`
      ALTER TABLE products 
      ALTER COLUMN created_at SET NOT NULL,
      ALTER COLUMN updated_at SET NOT NULL;
    `);

    console.log('✅ Timestamp columns fixed successfully');

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
