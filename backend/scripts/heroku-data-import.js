const fs = require('fs');
const path = require('path');
const { sequelize } = require('../models');

async function importHerokuData() {
  try {
    console.log('📂 Looking for export files...');
    
    const exportDir = path.join(__dirname, '../exports');
    if (!fs.existsSync(exportDir)) {
      console.error('❌ Export directory not found. Run heroku-data-export.js first!');
      process.exit(1);
    }

    // Find the most recent export file
    const exportFiles = fs.readdirSync(exportDir)
      .filter(file => file.startsWith('heroku-data-export-') && file.endsWith('.json'))
      .sort()
      .reverse();

    if (exportFiles.length === 0) {
      console.error('❌ No export files found. Run heroku-data-export.js first!');
      process.exit(1);
    }

    const latestExportFile = path.join(exportDir, exportFiles[0]);
    console.log(`📄 Using export file: ${exportFiles[0]}`);

    // Read the export data
    const exportData = JSON.parse(fs.readFileSync(latestExportFile, 'utf8'));
    
    console.log('🔗 Connecting to local database...');
    await sequelize.authenticate();
    console.log('✅ Connected to local database successfully');

    console.log('\n⚠️  WARNING: This will overwrite existing data in your local database!');
    console.log('Press Ctrl+C now if you want to cancel...');
    
    // Wait 5 seconds for user to cancel
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('\n🚀 Starting data import...');

    let totalImported = 0;
    const importOrder = [
      'locations',
      'users', 
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

    // Disable foreign key checks temporarily
    await sequelize.query('SET session_replication_role = replica;');

    for (const table of importOrder) {
      if (!exportData.data[table] || exportData.data[table].length === 0) {
        console.log(`⏭️  Skipping ${table} (no data)`);
        continue;
      }

      try {
        console.log(`📥 Importing ${table}...`);
        
        // Clear existing data
        await sequelize.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE;`);
        
        const records = exportData.data[table];
        let imported = 0;

        // Import in batches of 100 records
        const batchSize = 100;
        for (let i = 0; i < records.length; i += batchSize) {
          const batch = records.slice(i, i + batchSize);
          
          // Build INSERT query
          if (batch.length > 0) {
            const columns = Object.keys(batch[0]);
            const placeholders = batch.map((_, index) => 
              `(${columns.map((_, colIndex) => `$${index * columns.length + colIndex + 1}`).join(', ')})`
            ).join(', ');
            
            const values = batch.flatMap(record => columns.map(col => record[col]));
            
            const insertQuery = `
              INSERT INTO "${table}" (${columns.map(col => `"${col}"`).join(', ')})
              VALUES ${placeholders}
            `;
            
            await sequelize.query(insertQuery, { replacements: values });
            imported += batch.length;
          }
        }

        totalImported += imported;
        console.log(`   ✅ ${imported} records imported to ${table}`);

        // Reset sequence if table has an id column
        try {
          await sequelize.query(`SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), MAX(id)) FROM "${table}";`);
        } catch (seqError) {
          // Ignore if no sequence exists
        }

      } catch (error) {
        console.error(`   ❌ Error importing ${table}:`, error.message);
      }
    }

    // Re-enable foreign key checks
    await sequelize.query('SET session_replication_role = DEFAULT;');

    console.log('\n🎉 Import completed!');
    console.log(`📊 Total records imported: ${totalImported}`);
    console.log(`📅 Original export date: ${exportData.exportInfo.timestamp}`);

    // Verify import
    console.log('\n🔍 Verifying import...');
    for (const table of importOrder) {
      if (exportData.data[table] && exportData.data[table].length > 0) {
        try {
          const [result] = await sequelize.query(`SELECT COUNT(*) as count FROM "${table}"`);
          const localCount = parseInt(result[0].count);
          const exportedCount = exportData.data[table].length;
          
          if (localCount === exportedCount) {
            console.log(`   ✅ ${table}: ${localCount} records (verified)`);
          } else {
            console.log(`   ⚠️  ${table}: ${localCount} local vs ${exportedCount} exported`);
          }
        } catch (error) {
          console.log(`   ❌ Could not verify ${table}`);
        }
      }
    }

    console.log('\n✅ Heroku data import completed successfully!');

  } catch (error) {
    console.error('❌ Import failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await sequelize.close();
  }
}

importHerokuData();