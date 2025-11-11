const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');

// Schema-aware column mapping for handling different column naming conventions
const COLUMN_MAPPINGS = {
  // Tables with mixed camelCase/snake_case columns
  users: {
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    'lastLoginAt': 'last_login_at',
    'resetToken': 'reset_token',
    'resetTokenExpiry': 'reset_token_expiry',
    'locationId': 'location_id',
    'isActive': 'is_active',
    'firstName': 'first_name',
    'lastName': 'last_name'
  },
  locations: {
    'createdAt': 'created_at',
    'updatedAt': 'updated_at'
  },
  categories: {
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    'isActive': 'is_active'
  },
  global_attributes: {
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    'isActive': 'is_active'
  },
  product_types: {
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    'isActive': 'is_active',
    'unitOfMeasure': 'unit_of_measure'
  },
  products: {
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    'isActive': 'is_active',
    'productTypeId': 'product_type_id',
    'unitOfMeasure': 'unit_of_measure',
    'supplierCode': 'supplier_code',
    'imageUrl': 'image_url',
    'deletedAt': 'deleted_at'
  },
  inventory: {
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    'productId': 'product_id',
    'locationId': 'location_id',
    'quantitySqm': 'quantity_sqm'
  },
  inventory_logs: {
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    'productId': 'product_id',
    'locationId': 'location_id',
    'changeType': 'change_type',
    'changeAmount': 'change_amount',
    'previousQuantity': 'previous_quantity',
    'newQuantity': 'new_quantity',
    'userId': 'user_id'
  },
  sales: {
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    'customerName': 'customer_name',
    'customerPhone': 'customer_phone',
    'totalAmount': 'total_amount',
    'locationId': 'location_id',
    'userId': 'user_id',
    'paymentMethod': 'payment_method',
    'discountType': 'discount_type',
    'discountValue': 'discount_value',
    'subtotalAmount': 'subtotal_amount'
  },
  sale_items: {
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    'saleId': 'sale_id',
    'productId': 'product_id',
    'locationId': 'location_id',
    'unitPrice': 'unit_price',
    'lineTotal': 'line_total'
  },
  returns: {
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    'saleId': 'sale_id',
    'processedById': 'processed_by_id',
    'returnDate': 'return_date',
    'returnType': 'return_type',
    'totalRefundAmount': 'total_refund_amount',
    'refundMethod': 'refund_method'
  },
  return_items: {
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    'returnId': 'return_id',
    'saleItemId': 'sale_item_id',
    'productId': 'product_id',
    'locationId': 'location_id',
    'returnReason': 'return_reason',
    'refundAmount': 'refund_amount',
    'exchangeProductId': 'exchange_product_id'
  },
  user_activities: {
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    'userId': 'user_id',
    'resourceId': 'resource_id',
    'ipAddress': 'ip_address',
    'userAgent': 'user_agent'
  }
};

// Function to transform record columns based on mapping
function transformRecord(tableName, record) {
  const mapping = COLUMN_MAPPINGS[tableName];
  if (!mapping) return record;

  const transformed = {};
  for (const [key, value] of Object.entries(record)) {
    // Apply column mapping if exists, otherwise keep original
    transformed[mapping[key] || key] = value;
  }
  return transformed;
}

// Function to get target columns for a table (handles missing columns gracefully)
async function getTargetColumns(sequelize, tableName) {
  try {
    const [columns] = await sequelize.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = '${tableName}' ORDER BY column_name`
    );
    return columns.map(col => col.column_name);
  } catch (error) {
    console.warn(`⚠️  Could not get columns for ${tableName}, using all available:`, error.message);
    return null; // Will use all columns from data
  }
}

async function importToNewHeroku() {
  try {
    console.log('📂 Looking for export files...');

    const exportDir = path.join(__dirname, '../exports');
    if (!fs.existsSync(exportDir)) {
      console.error('❌ Export directory not found!');
      process.exit(1);
    }

    // Find the most recent export file
    const exportFiles = fs.readdirSync(exportDir)
      .filter(file => file.startsWith('heroku-data-export-') && file.endsWith('.json'))
      .sort()
      .reverse();

    if (exportFiles.length === 0) {
      console.error('❌ No export files found!');
      process.exit(1);
    }

    const latestExportFile = path.join(exportDir, exportFiles[0]);
    console.log(`📄 Using export file: ${exportFiles[0]}`);

    // Read the export data
    const exportData = JSON.parse(fs.readFileSync(latestExportFile, 'utf8'));
    
    console.log('🔗 Connecting to new Heroku database...');
    
    // Use DATABASE_URL from environment or command line
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.error('❌ DATABASE_URL not found! Please set it as an environment variable.');
      console.log('\nUsage:');
      console.log('  $env:DATABASE_URL="postgres://..."; node scripts/import-to-new-heroku.js');
      process.exit(1);
    }

    const sequelize = new Sequelize(databaseUrl, {
      dialect: 'postgres',
      logging: false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      },
    });

    await sequelize.authenticate();
    console.log('✅ Connected to new Heroku database successfully');

    console.log('\n⚠️  WARNING: This will overwrite existing data in the new Heroku database!');
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

    // Note: Heroku doesn't allow setting session_replication_role
    // We'll work around this by carefully managing the import order

    for (const table of importOrder) {
      if (!exportData.data[table] || exportData.data[table].length === 0) {
        console.log(`⏭️  Skipping ${table} (no data)`);
        continue;
      }

      try {
        console.log(`📥 Importing ${table}...`);

        // Get target database columns to handle schema differences
        const targetColumns = await getTargetColumns(sequelize, table);
        console.log(`   ℹ️  Target columns for ${table}: ${targetColumns ? targetColumns.length : 'unknown'}`);

        // Clear existing data carefully without CASCADE
        if (table === 'users') {
          // Keep the default admin user
          await sequelize.query(`DELETE FROM "${table}" WHERE email != 'fortuneetfeveur@gmail.com';`);
        } else if (table === 'locations') {
          // Keep the default location
          await sequelize.query(`DELETE FROM "${table}" WHERE name != 'Default Location';`);
        } else {
          // For other tables, just delete all rows
          await sequelize.query(`DELETE FROM "${table}";`);
        }

        const records = exportData.data[table];
        let imported = 0;
        let skipped = 0;

        // Import in batches of 50 records (smaller for Heroku)
        const batchSize = 50;
        for (let i = 0; i < records.length; i += batchSize) {
          const batch = records.slice(i, i + batchSize);

          // Transform records to match target schema
          const transformedBatch = batch.map(record => {
            const transformed = transformRecord(table, record);

            // Filter out columns that don't exist in target schema
            if (targetColumns) {
              const filtered = {};
              for (const [key, value] of Object.entries(transformed)) {
                if (targetColumns.includes(key)) {
                  filtered[key] = value;
                }
              }
              return filtered;
            }
            return transformed;
          });

          // Skip empty batches after transformation
          const validRecords = transformedBatch.filter(record => Object.keys(record).length > 0);
          if (validRecords.length === 0) {
            skipped += batch.length;
            continue;
          }

          // Build INSERT query with transformed data
          if (validRecords.length > 0) {
            const columns = Object.keys(validRecords[0]);
            const placeholders = validRecords.map((_, index) =>
              `(${columns.map((_, colIndex) => `$${index * columns.length + colIndex + 1}`).join(', ')})`
            ).join(', ');

            const values = validRecords.flatMap(record => columns.map(col => record[col]));

            // Use ON CONFLICT for tables with unique constraints
            let conflictClause = '';
            if (table === 'users' || table === 'locations') {
              conflictClause = ' ON CONFLICT (id) DO UPDATE SET ' +
                columns.filter(col => col !== 'id').map(col => `"${col}" = EXCLUDED."${col}"`).join(', ');
            }

            const insertQuery = `
              INSERT INTO "${table}" (${columns.map(col => `"${col}"`).join(', ')})
              VALUES ${placeholders}
              ${conflictClause}
            `;

            await sequelize.query(insertQuery, { replacements: values });
            imported += validRecords.length;
            skipped += (batch.length - validRecords.length);
          }
        }

        totalImported += imported;
        console.log(`   ✅ ${imported} records imported to ${table}${skipped > 0 ? ` (${skipped} skipped due to schema mismatch)` : ''}`);

        // Reset sequence if table has an id column
        try {
          await sequelize.query(`SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE(MAX(id), 1)) FROM "${table}";`);
        } catch (seqError) {
          // Ignore if no sequence exists
        }

      } catch (error) {
        console.error(`   ❌ Error importing ${table}:`, error.message);
        console.error(`   Details:`, error);
      }
    }

    console.log('\n🎉 Import completed!');
    console.log(`📊 Total records imported: ${totalImported}`);
    console.log(`📅 Original export date: ${exportData.exportInfo.timestamp}`);

    // Verify import
    console.log('\n🔍 Verifying import...');
    for (const table of importOrder) {
      if (exportData.data[table] && exportData.data[table].length > 0) {
        try {
          const [result] = await sequelize.query(`SELECT COUNT(*) as count FROM "${table}"`);
          const newCount = parseInt(result[0].count);
          const exportedCount = exportData.data[table].length;
          
          console.log(`   ℹ️  ${table}: ${newCount} records in new database (${exportedCount} in export)`);
        } catch (error) {
          console.log(`   ❌ Could not verify ${table}`);
        }
      }
    }

    console.log('\n✅ Data import to new Heroku database completed successfully!');
    console.log('\n🔗 Your app should now have all the previous data.');

  } catch (error) {
    console.error('❌ Import failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (typeof sequelize !== 'undefined') {
      await sequelize.close();
    }
    process.exit(0);
  }
}

importToNewHeroku();
