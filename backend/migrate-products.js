const { sequelize } = require('./config/database');

async function migrateProductsTable() {
  try {
    console.log('Starting products table migration...');

    // Add new columns to products table
    await sequelize.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS category VARCHAR(255) DEFAULT 'General',
      ADD COLUMN IF NOT EXISTS "imageUrl" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS description TEXT,
      ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP WITH TIME ZONE;
    `);

    console.log('✅ Products table migration completed successfully!');
    console.log('Added columns: category, imageUrl, description, isActive, deletedAt');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateProductsTable()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = migrateProductsTable;
