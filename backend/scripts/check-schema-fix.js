const { sequelize } = require('../config/database');

async function checkSchema() {
  try {
    console.log('🔍 Checking database schema for problematic tables...\n');

    // Check sale_items columns
    console.log('📋 sale_items table columns:');
    const [saleItemsColumns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'sale_items'
      ORDER BY ordinal_position
    `);
    saleItemsColumns.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    console.log('\n📋 user_activities table columns:');
    const [userActivitiesColumns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'user_activities'
      ORDER BY ordinal_position
    `);
    userActivitiesColumns.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    console.log('\n🔧 Applying fixes...');

    // Fix user_activities column name
    await sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_name='user_activities' AND column_name='user_id') THEN
          ALTER TABLE user_activities RENAME COLUMN user_id TO "userId";
        END IF;
      END $$;
    `);
    console.log('✅ Fixed user_activities column name');

    // Make totalPrice nullable temporarily
    await sequelize.query(`ALTER TABLE sale_items ALTER COLUMN "totalPrice" DROP NOT NULL;`);
    console.log('✅ Made totalPrice nullable in sale_items');

    console.log('\n🎯 Schema fixes applied! Run the import again.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkSchema();