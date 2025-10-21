#!/usr/bin/env node
// Reset migration tracker to force re-run all migrations
// WARNING: This will delete the sequelize meta table so all migrations re-run

const pg = require('pg');

const DATABASE_URL = "postgresql://postgres:FcfkEXFYenNmQJFKuTsAFwbTPXuoTmLQ@postgres.railway.internal:5432/railway";

async function resetMigrations() {
  const client = new pg.Client(DATABASE_URL);
  
  try {
    await client.connect();
    console.log('✅ Connected to Railway database');
    
    // Delete the SequelizeMeta table to force re-run all migrations
    await client.query('DROP TABLE IF EXISTS "SequelizeMeta";');
    console.log('✅ Dropped SequelizeMeta table - migrations can now re-run');
    
    // Also drop all app tables to start fresh
    const tables = ['Returns', 'returns', 'user_activities', 'inventory_logs', 'sales', 'categories', 'users', 'locations', 'global_attributes', 'products', 'product_types', 'inventory', 'sale_items', 'return_items'];
    
    for (const table of tables) {
      try {
        await client.query(`DROP TABLE IF EXISTS "${table}" CASCADE;`);
        console.log(`✅ Dropped table: ${table}`);
      } catch (e) {
        // table might not exist, skip
      }
    }
    
    console.log('\n✅ Database reset complete - ready for fresh migration run');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

resetMigrations();
