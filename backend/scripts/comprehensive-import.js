const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');

// Comprehensive table-specific column mappings
const TABLE_COLUMN_MAPPINGS = {
  users: {
    // Users table has some camelCase and some snake_case mixed
    locationId: 'locationId',  // Keep as is
    firstName: 'firstName',     // Keep as is
    lastName: 'lastName',       // Keep as is
    isActive: 'isActive',       // Keep as is
    lastLoginAt: 'lastLoginAt', // Keep as is
    resetToken: 'resetToken',   // Keep as is
    resetTokenExpiry: 'resetTokenExpiry', // Keep as is
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  locations: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  categories: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  global_attributes: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  product_types: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  products: {
    productTypeId: 'product_type_id',
    unitOfMeasure: 'unit_of_measure',
    supplierCode: 'supplier_code',
    imageUrl: 'image_url',
    isActive: 'is_active',
    deletedAt: 'deleted_at',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  inventory: {
    productId: 'productId',       // Keep as is (camelCase in new schema!)
    locationId: 'locationId',     // Keep as is (camelCase in new schema!)
    quantitySqm: 'quantitySqm',   // Keep as is (camelCase in new schema!)
    updatedAt: 'updated_at',
    createdAt: 'created_at'
  },
  inventory_logs: {
    productId: 'productId',       // Keep as is
    locationId: 'locationId',     // Keep as is
    changeType: 'changeType',     // Keep as is
    changeAmount: 'changeAmount', // Keep as is
    previousQuantity: 'previousQuantity', // Keep as is
    newQuantity: 'newQuantity',   // Keep as is
    userId: 'userId',             // Keep as is
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  sales: {
    customerName: 'customerName',   // Keep as is
    customerPhone: 'customerPhone', // Keep as is
    totalAmount: 'totalAmount',     // Keep as is
    locationId: 'locationId',       // Keep as is
    userId: 'userId',               // Keep as is
    paymentMethod: 'paymentMethod', // Keep as is
    discountType: 'discountType',   // Keep as is
    discountValue: 'discountValue', // Keep as is
    subtotalAmount: 'subtotalAmount', // Keep as is
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  sale_items: {
    saleId: 'saleId',         // Keep as is
    productId: 'productId',   // Keep as is
    quantity: 'quantity',     // Keep as is
    unit: 'quantity',         // Map 'unit' to 'quantity' (schema change!)
    unitPrice: 'unitPrice',   // Keep as is
    lineTotal: 'totalPrice',  // Map to totalPrice
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  returns: {
    saleId: 'saleid',                   // Map to lowercase!
    processedBy: 'processedbyid',       // Map to lowercase with 'id'
    returnDate: 'returndate',           // Map to lowercase
    returnType: 'returntype',           // Map to lowercase
    totalRefundAmount: 'totalrefundamount', // Map to lowercase
    refundMethod: 'refundmethod',       // Map to lowercase
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  return_items: {
    returnId: 'returnId',             // Keep as is
    saleItemId: 'saleItemId',         // Keep as is
    productId: 'productId',           // Keep as is
    locationId: 'locationId',         // Keep as is
    returnReason: 'returnReason',     // Keep as is
    refundAmount: 'refundAmount',     // Keep as is
    exchangeProductId: 'exchangeProductId', // Keep as is
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  user_activities: {
    userId: 'userId',         // Keep as is
    resourceId: 'resourceId', // Keep as is
    ipAddress: 'ipAddress',   // Keep as is
    userAgent: 'userAgent',   // Keep as is
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
};

function mapColumnNames(table, record) {
  const mapping = TABLE_COLUMN_MAPPINGS[table] || {};
  const mappedRecord = {};
  
  for (const [key, value] of Object.entries(record)) {
    // Use mapping if exists, otherwise keep original
    const mappedKey = mapping[key] !== undefined ? mapping[key] : key;
    
    // Skip if mapping resulted in same column (avoid duplicates)
    if (mappedKey && (mappedKey !== key || !mappedRecord[mappedKey])) {
      // Convert objects/arrays to JSON strings for JSONB columns
      if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        mappedRecord[mappedKey] = JSON.stringify(value);
      } else if (Array.isArray(value)) {
        mappedRecord[mappedKey] = JSON.stringify(value);
      } else {
        mappedRecord[mappedKey] = value;
      }
    }
  }
  
  return mappedRecord;
}

async function comprehensiveImport() {
  let sequelize;
  try {
    console.log('📂 Looking for export files...');
    
    const exportDir = path.join(__dirname, '../exports');
    if (!fs.existsSync(exportDir)) {
      console.error('❌ Export directory not found!');
      process.exit(1);
    }

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

    const exportData = JSON.parse(fs.readFileSync(latestExportFile, 'utf8'));
    
    console.log('🔗 Connecting to new Heroku database...');
    
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.error('❌ DATABASE_URL not found!');
      process.exit(1);
    }

    sequelize = new Sequelize(databaseUrl, {
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
    console.log('✅ Connected to new Heroku database');

    console.log('\n⚠️  WARNING: This will import data to the new Heroku database!');
    console.log('Press Ctrl+C now if you want to cancel...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('\n🚀 Starting comprehensive data import...');

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

    const results = {};

    for (const table of importOrder) {
      if (!exportData.data[table] || exportData.data[table].length === 0) {
        console.log(`\n⏭️  Skipping ${table} (no data)`);
        results[table] = { imported: 0, skipped: 0, errors: 0 };
        continue;
      }

      try {
        console.log(`\n📥 Importing ${table}...`);
        
        const records = exportData.data[table];
        let imported = 0;
        let skipped = 0;
        let errors = 0;

        for (const record of records) {
          try {
            // Map column names
            const mappedRecord = mapColumnNames(table, record);
            
            // Filter out undefined keys but keep null values
            const columns = Object.keys(mappedRecord).filter(key => mappedRecord[key] !== undefined);
            const values = columns.map(col => mappedRecord[col]);
            
            if (columns.length === 0) {
              errors++;
              console.error(`   ⚠️  Record ID ${record.id}: No valid columns after mapping`);
              continue;
            }
            
            // Debug first record of each table
            if (imported === 0 && skipped === 0 && errors === 0) {
              console.log(`   🔍 Debug first record - Columns: ${columns.join(', ')}`);
            }
            
            // Check if record exists
            let recordExists = false;
            try {
              if (mappedRecord.id !== undefined && mappedRecord.id !== null) {
                const existing = await sequelize.query(
                  `SELECT id FROM "${table}" WHERE id = :id`,
                  { 
                    replacements: { id: mappedRecord.id },
                    type: sequelize.QueryTypes.SELECT 
                  }
                );
                recordExists = existing && existing.length > 0;
              }
              
              // For categories, also check by name to avoid duplicates
              if (!recordExists && table === 'categories' && mappedRecord.name) {
                const existing = await sequelize.query(
                  `SELECT id FROM "${table}" WHERE name = :name`,
                  { 
                    replacements: { name: mappedRecord.name },
                    type: sequelize.QueryTypes.SELECT 
                  }
                );
                if (existing && existing.length > 0) {
                  skipped++;
                  continue;
                }
              }
            } catch (e) {
              // Table might not have id column or other issue - skip existence check
            }

            if (recordExists) {
              // Update existing record
              const updateColumns = columns.filter(col => col !== 'id');

              if (updateColumns.length > 0) {
                const updatePairs = updateColumns
                  .map((col) => `"${col}" = :${col}`)
                  .join(', ');

                const replacements = {};
                updateColumns.forEach(col => {
                  replacements[col] = mappedRecord[col];
                });
                replacements.id = mappedRecord.id;

                await sequelize.query(
                  `UPDATE "${table}" SET ${updatePairs} WHERE id = :id`,
                  { 
                    replacements,
                    type: sequelize.QueryTypes.UPDATE 
                  }
                );
              }
              skipped++;
            } else {
              // Insert new record
              const columnNames = columns.map(col => `:${col}`).join(', ');
              const replacements = {};
              columns.forEach(col => {
                replacements[col] = mappedRecord[col];
              });
              
              await sequelize.query(
                `INSERT INTO "${table}" (${columns.map(col => `"${col}"`).join(', ')})
                 VALUES (${columnNames})`,
                { 
                  replacements,
                  type: sequelize.QueryTypes.INSERT 
                }
              );
              imported++;
            }
          } catch (error) {
            errors++;
            if (errors <= 3) {  // Only show first 3 errors per table
              console.error(`   ⚠️  Error with record ID ${record.id}: ${error.message}`);
            }
          }
        }

        // Reset sequence
        try {
          await sequelize.query(
            `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 1));`
          );
        } catch (seqError) {
          // Ignore if no sequence exists
        }

        totalImported += imported;
        results[table] = { imported, skipped, errors };
        
        if (errors > 3) {
          console.log(`   ✅ ${imported} imported, ${skipped} skipped, ${errors} errors (showing first 3)`);
        } else {
          console.log(`   ✅ ${imported} imported, ${skipped} skipped${errors > 0 ? `, ${errors} errors` : ''}`);
        }

      } catch (error) {
        console.error(`   ❌ Fatal error importing ${table}:`, error.message);
        results[table] = { imported: 0, skipped: 0, errors: records.length };
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 IMPORT COMPLETED!');
    console.log('='.repeat(60));
    console.log(`\n📊 Total new records imported: ${totalImported}`);
    console.log(`📅 Original export date: ${exportData.exportInfo.timestamp}\n`);

    // Summary table
    console.log('📋 DETAILED RESULTS:');
    console.log('-'.repeat(60));
    console.log('Table'.padEnd(20) + 'Imported'.padEnd(12) + 'Skipped'.padEnd(12) + 'Errors');
    console.log('-'.repeat(60));
    
    for (const [table, result] of Object.entries(results)) {
      console.log(
        table.padEnd(20) + 
        result.imported.toString().padEnd(12) + 
        result.skipped.toString().padEnd(12) + 
        result.errors.toString()
      );
    }

    // Verify final counts
    console.log('\n🔍 FINAL DATABASE COUNTS:');
    console.log('-'.repeat(60));
    for (const table of importOrder) {
      try {
        const [result] = await sequelize.query(`SELECT COUNT(*) as count FROM "${table}"`);
        const count = parseInt(result[0].count);
        const exported = exportData.data[table]?.length || 0;
        const status = count >= exported ? '✅' : '⚠️';
        console.log(`   ${status} ${table.padEnd(20)} ${count} records (${exported} in export)`);
      } catch (error) {
        console.log(`   ❌ ${table.padEnd(20)} Could not verify`);
      }
    }

    console.log('\n✅ Data migration completed successfully!');
    console.log('🔗 Your Heroku app now has all the data from the export.\n');

  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (sequelize) {
      await sequelize.close();
    }
    process.exit(0);
  }
}

comprehensiveImport();
