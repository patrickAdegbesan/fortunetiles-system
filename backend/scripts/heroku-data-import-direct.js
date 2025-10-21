const fs = require('fs');
const path = require('path');
const { QueryTypes } = require('sequelize');
const db = require('../models');

// Function to escape SQL values
function escapeSQLValue(value) {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  if (typeof value === 'string') {
    return "'" + value.replace(/'/g, "''") + "'";
  }
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }
  if (value instanceof Date) {
    return "'" + value.toISOString() + "'";
  }
  return value.toString();
}

// Function to build INSERT statement
function buildInsertSQL(tableName, data) {
  if (!data || data.length === 0) return null;
  
  const columns = Object.keys(data[0]);
  const columnList = columns.map(col => `"${col}"`).join(', ');
  
  const values = data.map(record => {
    const valueList = columns.map(col => escapeSQLValue(record[col])).join(', ');
    return `(${valueList})`;
  }).join(',\n  ');
  
  return `INSERT INTO "${tableName}" (${columnList}) VALUES\n  ${values};`;
}

async function importHerokuData() {
  try {
    console.log('🚀 Starting Heroku data import with direct SQL...');
    
    // Read the exported data
    const exportsDir = path.join(__dirname, '..', 'exports');
    const exportFiles = fs.readdirSync(exportsDir).filter(f => f.startsWith('heroku-data-export-') && f.endsWith('.json'));
    
    if (exportFiles.length === 0) {
      throw new Error('Export file not found! Please run heroku-data-export.js first.');
    }
    
    // Use the most recent export file
    const latestExportFile = exportFiles.sort().reverse()[0];
    const dataPath = path.join(exportsDir, latestExportFile);
    console.log(`📂 Using export file: ${latestExportFile}`);

    const exportData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const { data: tableData, exportInfo } = exportData;

    console.log(`📊 Found export from ${exportInfo.timestamp} (${exportInfo.source})`);

    // Count total records
    let totalRecords = 0;
    Object.values(tableData).forEach(records => {
      if (Array.isArray(records)) totalRecords += records.length;
    });
    console.log(`📦 Total records to import: ${totalRecords}`);

    // Disable triggers temporarily
    await db.sequelize.query('SET session_replication_role = REPLICA;', { type: QueryTypes.RAW });

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

    for (const tableName of importOrder) {
      if (!tableData[tableName] || tableData[tableName].length === 0) {
        console.log(`⏭️  Skipping ${tableName} (no data)`);
        continue;
      }

      const records = tableData[tableName];
      console.log(`📥 Importing ${tableName}... (${records.length} records)`);

      try {
        // Clear existing data
        await db.sequelize.query(`TRUNCATE TABLE "${tableName}" RESTART IDENTITY CASCADE;`, { type: QueryTypes.RAW });

        // Build and execute direct INSERT statement
        const insertSQL = buildInsertSQL(tableName, records);
        if (insertSQL) {
          await db.sequelize.query(insertSQL, { type: QueryTypes.RAW });
          
          // Reset sequence if the table has an id column
          const hasId = records.some(record => record.id !== undefined);
          if (hasId) {
            const maxId = Math.max(...records.map(r => r.id || 0));
            if (maxId > 0) {
              await db.sequelize.query(
                `SELECT setval(pg_get_serial_sequence('"${tableName}"', 'id'), ${maxId}, true);`,
                { type: QueryTypes.RAW }
              );
            }
          }
        }

        totalImported += records.length;
        console.log(`   ✅ ${records.length}/${records.length} records imported to ${tableName}`);
        
      } catch (error) {
        console.error(`   ❌ Failed to import ${tableName}:`, error.message);
        // Continue with other tables
      }
    }

    // Re-enable triggers
    await db.sequelize.query('SET session_replication_role = DEFAULT;', { type: QueryTypes.RAW });

    console.log('\n🎉 Import completed!');
    console.log(`📊 Total records imported: ${totalImported}`);
    console.log(`📅 Original export date: ${exportInfo.timestamp}`);

    // Verify the import
    console.log('\n🔍 Verifying import...');
    for (const tableName of importOrder) {
      if (tableData[tableName] && tableData[tableName].length > 0) {
        try {
          const result = await db.sequelize.query(`SELECT COUNT(*) as count FROM "${tableName}"`, { type: QueryTypes.SELECT });
          const count = result[0].count;
          const expected = tableData[tableName].length;
          if (count == expected) {
            console.log(`   ✅ ${tableName}: ${count} records imported`);
          } else {
            console.log(`   ⚠️  ${tableName}: ${count}/${expected} records imported`);
          }
        } catch (error) {
          console.log(`   ❌ ${tableName}: verification failed - ${error.message}`);
        }
      }
    }

    console.log('\n✅ Heroku data import process completed!');
    console.log('🎯 Your production data is now available in your local database!');
    console.log('🚀 You can now start your backend and frontend to see your production data locally.');

  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  } finally {
    await db.sequelize.close();
  }
}

// Run the import
importHerokuData();