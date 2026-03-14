#!/usr/bin/env node

/**
 * Import Heroku Production Data to Railway Database
 * 
 * This script connects to both Heroku's production database and Railway's database,
 * then copies all data from Heroku to Railway.
 * 
 * Usage: node scripts/import-heroku-data-to-railway.js
 * 
 * Environment variables:
 * - HEROKU_DATABASE_URL: Connection string to Heroku database
 * - DATABASE_URL: Connection string to Railway database (used in production)
 */

const { Sequelize } = require('sequelize');
require('dotenv').config();

// Heroku production database URL
const HEROKU_DB_URL = process.env.HEROKU_DATABASE_URL;

// Railway database URL
const RAILWAY_DB_URL = process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL || process.env.DB_URL;

const sslRejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false';

if (!HEROKU_DB_URL) {
  console.error('❌ ERROR: HEROKU_DATABASE_URL environment variable not set');
  console.error('Set the Heroku database connection URL (do not hardcode credentials in git).');
  process.exit(1);
}

if (!RAILWAY_DB_URL) {
  console.error('❌ ERROR: DATABASE_URL or DB_URL environment variable not set');
  console.error('Please set the Railway database connection URL');
  process.exit(1);
}

console.log('🔄 Starting data import from Heroku to Railway...\n');

// Connect to Heroku database
const herokuSequelize = new Sequelize(HEROKU_DB_URL, {
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: sslRejectUnauthorized,
    },
  },
});

// Connect to Railway database
const railwaySequelize = new Sequelize(RAILWAY_DB_URL, {
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: sslRejectUnauthorized,
    },
  },
});

async function importData() {
  try {
    // Test connections
    console.log('🔌 Testing Heroku connection...');
    await herokuSequelize.authenticate();
    console.log('✅ Connected to Heroku database\n');

    console.log('🔌 Testing Railway connection...');
    await railwaySequelize.authenticate();
    console.log('✅ Connected to Railway database\n');

    // List of tables to import (in order of dependencies)
    const tablesToImport = [
      'locations',
      'users',
      'product_types',
      'products',
      'categories',
      'global_attributes',
      'inventory',
      'inventory_logs',
      'sales',
      'sale_items',
      'user_activities',
      'returns',
      'return_items',
    ];

    console.log('📊 Importing data...\n');

    for (const tableName of tablesToImport) {
      try {
        // Get all records from Heroku
        const [records] = await herokuSequelize.query(`SELECT * FROM "${tableName}";`);
        
        if (records.length === 0) {
          console.log(`⏭️  ${tableName}: No data to import`);
          continue;
        }

        // Get column names
        const columns = Object.keys(records[0]);
        
        // Prepare INSERT statement
        const columnList = columns.map(col => `"${col}"`).join(', ');
        const valuePlaceholders = columns.map((_, i) => `$${i + 1}`).join(', ');

        // Insert data into Railway
        let importedCount = 0;
        for (const record of records) {
          const values = columns.map(col => record[col]);
          try {
            await railwaySequelize.query(
              `INSERT INTO "${tableName}" (${columnList}) VALUES (${valuePlaceholders}) ON CONFLICT DO NOTHING;`,
              {
                bind: values,
                type: Sequelize.QueryTypes.INSERT,
              }
            );
            importedCount++;
          } catch (err) {
            if (err.message.includes('unique violation') || err.message.includes('duplicate key')) {
              // Skip duplicates
              continue;
            }
            throw err;
          }
        }

        console.log(`✅ ${tableName}: Imported ${importedCount}/${records.length} records`);
      } catch (err) {
        // Table might not exist, skip it
        if (err.message.includes('does not exist')) {
          console.log(`⏭️  ${tableName}: Table doesn't exist yet (will be created by migrations)`);
        } else {
          console.error(`⚠️  ${tableName}: Error importing -`, err.message);
        }
      }
    }

    console.log('\n✅ Data import completed successfully!');
  } catch (error) {
    console.error('❌ Error during import:', error.message);
    process.exit(1);
  } finally {
    await herokuSequelize.close();
    await railwaySequelize.close();
  }
}

importData();
