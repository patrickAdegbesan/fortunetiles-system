const { Client } = require('pg');

async function reset() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Delete migration records
    await client.query('DELETE FROM "SequelizeMeta"');
    console.log('✅ Cleared SequelizeMeta');

    // Drop all tables
    const tables = [
      'user_activities',
      'global_attributes',
      'sales',
      'categories',
      'users',
      'locations',
      'inventory_logs',
      'products',
      'product_types',
      'inventory',
      'returns'
    ];

    for (const table of tables) {
      try {
        await client.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
        console.log(`✅ Dropped ${table}`);
      } catch (e) {
        console.log(`ℹ️  ${table} didn't exist`);
      }
    }

    console.log('✅ Database reset complete!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

reset();
