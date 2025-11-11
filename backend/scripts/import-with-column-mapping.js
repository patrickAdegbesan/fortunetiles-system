const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');

// Column name mapping from camelCase to snake_case
const columnMappings = {
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  productId: 'product_id',
  locationId: 'location_id',
  quantitySqm: 'quantity_sqm',
  userId: 'user_id',
  saleId: 'sale_id',
  saleItemId: 'sale_item_id',
  returnId: 'return_id',
  ipAddress: 'ip_address',
  userAgent: 'user_agent',
  resourceId: 'resource_id',
  customerName: 'customer_name',
  customerPhone: 'customer_phone',
  totalAmount: 'total_amount',
  paymentMethod: 'payment_method',
  discountType: 'discount_type',
  discountValue: 'discount_value',
  subtotalAmount: 'subtotal_amount',
  unitPrice: 'unit_price',
  lineTotal: 'line_total',
  changeType: 'change_type',
  changeAmount: 'change_amount',
  previousQuantity: 'previous_quantity',
  newQuantity: 'new_quantity',
  processedBy: 'processed_by',
  returnDate: 'return_date',
  returnType: 'return_type',
  totalRefundAmount: 'total_refund_amount',
  refundMethod: 'refund_method',
  returnReason: 'return_reason',
  refundAmount: 'refund_amount',
  exchangeProductId: 'exchange_product_id'
};

function mapColumnNames(record) {
  const mappedRecord = {};
  for (const [key, value] of Object.entries(record)) {
    const mappedKey = columnMappings[key] || key;
    mappedRecord[mappedKey] = value;
  }
  return mappedRecord;
}

async function importWithColumnMapping() {
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

    console.log('\n⚠️  WARNING: This will add data to the new Heroku database!');
    console.log('Press Ctrl+C now if you want to cancel...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('\n🚀 Starting data import with column mapping...');

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

    for (const table of importOrder) {
      if (!exportData.data[table] || exportData.data[table].length === 0) {
        console.log(`⏭️  Skipping ${table} (no data)`);
        continue;
      }

      try {
        console.log(`\n📥 Importing ${table}...`);
        
        const records = exportData.data[table];
        let imported = 0;
        let skipped = 0;

        // Map column names for all records
        const mappedRecords = records.map(mapColumnNames);

        // Import individually to handle conflicts better
        for (const record of mappedRecords) {
          try {
            const columns = Object.keys(record);
            const values = Object.values(record);
            const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
            
            // Check if record exists
            let recordExists = false;
            try {
              const [existing] = await sequelize.query(
                `SELECT id FROM "${table}" WHERE id = $1`,
                { replacements: [record.id] }
              );
              recordExists = existing.length > 0;
            } catch (e) {
              // Table might not have id column
            }

            if (recordExists) {
              // Update existing record
              const updatePairs = columns
                .filter(col => col !== 'id')
                .map((col, i) => `"${col}" = $${i + 2}`)
                .join(', ');
              
              if (updatePairs) {
                await sequelize.query(
                  `UPDATE "${table}" SET ${updatePairs} WHERE id = $1`,
                  { replacements: values }
                );
              }
              skipped++;
            } else {
              // Insert new record
              await sequelize.query(
                `INSERT INTO "${table}" (${columns.map(col => `"${col}"`).join(', ')})
                 VALUES (${placeholders})`,
                { replacements: values }
              );
              imported++;
            }
          } catch (error) {
            console.error(`   ⚠️  Error importing record ID ${record.id}:`, error.message);
          }
        }

        // Reset sequence
        try {
          await sequelize.query(
            `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE(MAX(id), 1)) FROM "${table}";`
          );
        } catch (seqError) {
          // Ignore if no sequence exists
        }

        totalImported += imported;
        console.log(`   ✅ ${imported} new records imported, ${skipped} existing records skipped`);

      } catch (error) {
        console.error(`   ❌ Error importing ${table}:`, error.message);
      }
    }

    console.log('\n🎉 Import completed!');
    console.log(`📊 Total new records imported: ${totalImported}`);
    console.log(`📅 Original export date: ${exportData.exportInfo.timestamp}`);

    // Verify import
    console.log('\n🔍 Verifying final counts...');
    for (const table of importOrder) {
      if (exportData.data[table] && exportData.data[table].length > 0) {
        try {
          const [result] = await sequelize.query(`SELECT COUNT(*) as count FROM "${table}"`);
          const count = parseInt(result[0].count);
          console.log(`   ℹ️  ${table}: ${count} records`);
        } catch (error) {
          console.log(`   ❌ Could not verify ${table}`);
        }
      }
    }

    console.log('\n✅ Data import to new Heroku database completed successfully!');

  } catch (error) {
    console.error('❌ Import failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (sequelize) {
      await sequelize.close();
    }
    process.exit(0);
  }
}

importWithColumnMapping();
