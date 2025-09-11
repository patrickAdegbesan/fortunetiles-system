require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'fortunetiles',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function fixDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing products table schema...');
    
    // Add missing columns one by one
    const alterQueries = [
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS category VARCHAR(255) DEFAULT 'General';`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS "imageUrl" VARCHAR(255);`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP WITH TIME ZONE;`
    ];

    for (const query of alterQueries) {
      try {
        await client.query(query);
        console.log('✅ Added column:', query.split('ADD COLUMN IF NOT EXISTS')[1].split(' ')[1]);
      } catch (error) {
        if (error.code === '42701') {
          console.log('⚠️  Column already exists:', query.split('ADD COLUMN IF NOT EXISTS')[1].split(' ')[1]);
        } else {
          throw error;
        }
      }
    }

    // Update existing products to have default values
    await client.query(`
      UPDATE products 
      SET category = 'General' 
      WHERE category IS NULL;
    `);

    await client.query(`
      UPDATE products 
      SET "isActive" = true 
      WHERE "isActive" IS NULL;
    `);

    console.log('✅ Database schema updated successfully!');
    
  } catch (error) {
    console.error('❌ Database fix failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixDatabase()
  .then(() => {
    console.log('🎉 Database fix completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fix failed:', error);
    process.exit(1);
  });
