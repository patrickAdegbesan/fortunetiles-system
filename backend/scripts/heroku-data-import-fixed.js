const fs = require('fs');
const path = require('path');
const { sequelize } = require('../models');

function transformRecord(table, record) {
  const transformed = { ...record };

  // Keep camelCase timestamps as-is - Sequelize models handle the mapping
  // No need to transform createdAt/updatedAt to created_at/updated_at

  // Table-specific transformations
  if (table === 'inventory') {
    // Add missing updatedAt if not present
    if (!transformed.updatedAt && transformed.createdAt) {
      transformed.updatedAt = transformed.createdAt;
    }
  }
  if (table === 'sales') {
    // Ensure createdAt exists
    if (!transformed.createdAt) {
      transformed.createdAt = new Date().toISOString();
    }
  }
  if (table === 'sale_items') {
    // Remove unit if present (not in Railway schema)
    if (transformed.unit !== undefined) {
      delete transformed.unit;
    }
    // Map lineTotal to totalPrice
    if (transformed.lineTotal !== undefined) {
      transformed.totalPrice = transformed.lineTotal;
      delete transformed.lineTotal;
    }
    // Remove locationId if present (not in current schema)
    if (transformed.locationId !== undefined) {
      delete transformed.locationId;
    }
  }
  if (table === 'product_types') {
    // Fix null unitOfMeasure values
    if (!transformed.unitOfMeasure || transformed.unitOfMeasure === null) {
      transformed.unitOfMeasure = 'pcs'; // Default value
    }
  }
  if (table === 'returns') {
    // Map processedBy to processedById
    if (transformed.processedBy !== undefined) {
      transformed.processedById = transformed.processedBy;
      delete transformed.processedBy;
    }
  }
  if (table === 'return_items') {
    // Add missing createdAt if not present
    if (!transformed.createdAt) {
      transformed.createdAt = new Date().toISOString();
    }
  }
  if (table === 'user_activities') {
    // Ensure createdAt exists
    if (!transformed.createdAt) {
      transformed.createdAt = new Date().toISOString();
    }
    // Fix user_id vs userId issue
    if (transformed.user_id !== undefined && !transformed.userId) {
      transformed.userId = transformed.user_id;
      delete transformed.user_id;
    }
  }

  return transformed;
}

async function importHerokuDataSimple() {
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

    // Wait 3 seconds for user to cancel
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('\n🚀 Starting data import...');

    let totalImported = 0;

    // Import order with proper model names
    const importOrder = [
      { table: 'locations', model: 'Location', data: exportData.data.locations },
      { table: 'users', model: 'User', data: exportData.data.users },
      { table: 'categories', model: 'Category', data: exportData.data.categories },
      { table: 'global_attributes', model: 'GlobalAttribute', data: exportData.data.global_attributes },
      { table: 'product_types', model: 'ProductType', data: exportData.data.product_types },
      { table: 'products', model: 'Product', data: exportData.data.products },
      { table: 'inventory', model: 'Inventory', data: exportData.data.inventory },
      // { table: 'inventory_logs', model: 'InventoryLog', data: exportData.data.inventory_logs }, // Skip: table doesn't exist in Railway
      { table: 'sales', model: 'Sale', data: exportData.data.sales },
      { table: 'sale_items', model: 'SaleItem', data: exportData.data.sale_items },
      { table: 'returns', model: 'Return', data: exportData.data.returns },
      { table: 'return_items', model: 'ReturnItem', data: exportData.data.return_items },
      { table: 'user_activities', model: 'UserActivity', data: exportData.data.user_activities }
    ];

    // Disable foreign key checks temporarily
    await sequelize.query('SET session_replication_role = replica;');

    for (const { table, model, data } of importOrder) {
      if (!data || data.length === 0) {
        console.log(`⏭️  Skipping ${table} (no data)`);
        continue;
      }

      try {
        console.log(`📥 Importing ${table}... (${data.length} records)`);

        // Clear existing data
        await sequelize.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE;`);

        let imported = 0;

        // Import records using Sequelize models
        for (const record of data) {
          try {
            const transformedRecord = transformRecord(table, record);
            await sequelize.models[model].create(transformedRecord, {
              hooks: false,  // Skip hooks to avoid password hashing issues
              validate: false  // Skip validation for import
            });
            imported++;

            // Show progress for large tables
            if (imported % 50 === 0) {
              console.log(`   ... ${imported}/${data.length} records imported`);
            }
          } catch (recordError) {
            console.log(`   ⚠️  Skipped 1 record in ${table}: ${recordError.message}`);
          }
        }

        totalImported += imported;
        console.log(`   ✅ ${imported}/${data.length} records imported to ${table}`);

        // Reset sequence if table has an id column
        try {
          const maxIdResult = await sequelize.query(`SELECT MAX(id) as max_id FROM "${table}"`);
          if (maxIdResult[0][0].max_id) {
            await sequelize.query(`SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), ${maxIdResult[0][0].max_id});`);
          }
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
    for (const { table, model, data } of importOrder) {
      if (data && data.length > 0) {
        try {
          const [result] = await sequelize.query(`SELECT COUNT(*) as count FROM "${table}"`);
          const localCount = parseInt(result[0].count);
          const exportedCount = data.length;

          if (localCount === exportedCount) {
            console.log(`   ✅ ${table}: ${localCount} records (verified)`);
          } else if (localCount > 0) {
            console.log(`   ⚠️  ${table}: ${localCount} local vs ${exportedCount} exported (partial import)`);
          } else {
            console.log(`   ❌ ${table}: 0 records imported`);
          }
        } catch (error) {
          console.log(`   ❌ Could not verify ${table}`);
        }
      }
    }

    console.log('\n✅ Heroku data import process completed!');

    if (totalImported > 0) {
      console.log('🎯 SUCCESS: Your production data has been imported to local database!');
      console.log('💡 You can now use your local system with all your production data.');
    } else {
      console.log('⚠️  No data was imported. Check the error messages above.');
      console.log('💡 This might be due to database schema differences between production and local.');
    }

  } catch (error) {
    console.error('❌ Import failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await sequelize.close();
  }
}

importHerokuDataSimple();