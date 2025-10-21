const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');

// Heroku production database connection
// You'll need to set your Heroku DATABASE_URL as environment variable
const DATABASE_URL = process.env.HEROKU_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Please set HEROKU_DATABASE_URL environment variable');
  console.log('💡 Get it from: heroku config:get DATABASE_URL -a your-app-name');
  process.exit(1);
}

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: false // Set to true if you want to see SQL queries
});

// Create export directory
const exportDir = path.join(__dirname, '../exports');
if (!fs.existsSync(exportDir)) {
  fs.mkdirSync(exportDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const exportFile = path.join(exportDir, `heroku-data-export-${timestamp}.json`);

async function exportAllData() {
  try {
    console.log('🔗 Connecting to Heroku database...');
    await sequelize.authenticate();
    console.log('✅ Connected to Heroku database successfully');

    const exportData = {
      exportInfo: {
        timestamp: new Date().toISOString(),
        source: 'Heroku Production Database',
        exportedBy: 'Data Export Script v1.0'
      },
      data: {}
    };

    // List of all tables to export
    const tablesToExport = [
      'users',
      'locations', 
      'categories',
      'global_attributes',
      'product_types',
      'products',
      'inventory',
      'inventory_logs',
      'sales',
      'sale_items',
      'returns',
      'return_items',
      'user_activities'
    ];

    let totalRecords = 0;

    console.log('📊 Starting data export...\n');

    for (const table of tablesToExport) {
      try {
        console.log(`📋 Exporting ${table}...`);
        
        // Get table data using raw query to handle any table structure
        const [results] = await sequelize.query(`SELECT * FROM "${table}" ORDER BY id`);
        
        exportData.data[table] = results;
        totalRecords += results.length;
        
        console.log(`   ✅ ${results.length} records exported from ${table}`);
      } catch (error) {
        console.log(`   ⚠️  Skipping ${table}: ${error.message}`);
        exportData.data[table] = [];
      }
    }

    // Export database schema information
    try {
      console.log('\n🏗️  Exporting database schema...');
      const [tables] = await sequelize.query(`
        SELECT table_name, column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        ORDER BY table_name, ordinal_position
      `);
      
      exportData.schema = tables;
      console.log(`   ✅ Schema information exported`);
    } catch (error) {
      console.log(`   ⚠️  Could not export schema: ${error.message}`);
    }

    // Export indexes and constraints
    try {
      console.log('🔧 Exporting indexes and constraints...');
      const [indexes] = await sequelize.query(`
        SELECT 
          schemaname, tablename, indexname, indexdef
        FROM pg_indexes 
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname
      `);
      
      exportData.indexes = indexes;
      console.log(`   ✅ ${indexes.length} indexes exported`);
    } catch (error) {
      console.log(`   ⚠️  Could not export indexes: ${error.message}`);
    }

    // Write to file
    console.log('\n💾 Writing export file...');
    fs.writeFileSync(exportFile, JSON.stringify(exportData, null, 2), 'utf8');
    
    // Create a summary file
    const summaryFile = path.join(exportDir, `export-summary-${timestamp}.txt`);
    const summary = `
HEROKU DATA EXPORT SUMMARY
==========================
Export Date: ${new Date().toISOString()}
Export File: ${path.basename(exportFile)}
Total Records: ${totalRecords}

TABLE BREAKDOWN:
${Object.keys(exportData.data).map(table => 
  `${table}: ${exportData.data[table].length} records`
).join('\n')}

FILES CREATED:
- ${path.basename(exportFile)} (Full JSON export)
- ${path.basename(summaryFile)} (This summary)

NEXT STEPS:
1. Review the exported data
2. Import into local database using heroku-data-import.js
3. Verify data integrity after import
`;

    fs.writeFileSync(summaryFile, summary, 'utf8');

    console.log('\n🎉 Export completed successfully!');
    console.log(`📁 Export file: ${exportFile}`);
    console.log(`📄 Summary file: ${summaryFile}`);
    console.log(`📊 Total records exported: ${totalRecords}`);
    console.log(`💾 File size: ${(fs.statSync(exportFile).size / 1024 / 1024).toFixed(2)} MB`);

  } catch (error) {
    console.error('❌ Export failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await sequelize.close();
  }
}

exportAllData();