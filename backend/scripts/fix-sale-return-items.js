const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');

async function fixSaleAndReturnItems() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found!');
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

  try {
    const exportFile = path.join(__dirname, '../exports/heroku-data-export-2025-10-20T23-07-15-026Z.json');
    const exportData = JSON.parse(fs.readFileSync(exportFile, 'utf8'));
    
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    // Import sale_items
    console.log('📥 Importing sale_items...');
    let saleItemsImported = 0;
    for (const item of exportData.data.sale_items) {
      try {
        await sequelize.query(
          `INSERT INTO "sale_items" (id, "saleId", "productId", quantity, "unitPrice", "totalPrice", created_at, updated_at)
           VALUES (:id, :saleId, :productId, :quantity, :unitPrice, :totalPrice, :created_at, :updated_at)
           ON CONFLICT (id) DO NOTHING`,
          {
            replacements: {
              id: item.id,
              saleId: item.saleId,
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.lineTotal, // Map lineTotal to totalPrice
              created_at: item.createdAt || new Date(),
              updated_at: item.updatedAt || new Date()
            },
            type: sequelize.QueryTypes.INSERT
          }
        );
        saleItemsImported++;
      } catch (error) {
        console.error(`   ⚠️  Error importing sale_item ${item.id}:`, error.message);
      }
    }
    console.log(`   ✅ ${saleItemsImported}/${exportData.data.sale_items.length} sale_items imported\n`);

    // Import return_items
    console.log('📥 Importing return_items...');
    let returnItemsImported = 0;
    for (const item of exportData.data.return_items) {
      try {
        await sequelize.query(
          `INSERT INTO "return_items" (id, "returnId", "saleItemId", "productId", "locationId", quantity, "returnReason", condition, "refundAmount", "exchangeProductId", created_at, updated_at)
           VALUES (:id, :returnId, :saleItemId, :productId, :locationId, :quantity, :returnReason, :condition, :refundAmount, :exchangeProductId, :created_at, :updated_at)
           ON CONFLICT (id) DO NOTHING`,
          {
            replacements: {
              id: item.id,
              returnId: item.returnId,
              saleItemId: item.saleItemId,
              productId: item.productId,
              locationId: item.locationId,
              quantity: item.quantity,
              returnReason: item.returnReason,
              condition: item.condition,
              refundAmount: item.refundAmount,
              exchangeProductId: item.exchangeProductId,
              created_at: item.createdAt || new Date(),
              updated_at: item.updatedAt || new Date()
            },
            type: sequelize.QueryTypes.INSERT
          }
        );
        returnItemsImported++;
      } catch (error) {
        console.error(`   ⚠️  Error importing return_item ${item.id}:`, error.message);
      }
    }
    console.log(`   ✅ ${returnItemsImported}/${exportData.data.return_items.length} return_items imported\n`);

    // Verify final counts
    const [saleItemsCount] = await sequelize.query('SELECT COUNT(*) as count FROM sale_items');
    const [returnItemsCount] = await sequelize.query('SELECT COUNT(*) as count FROM return_items');
    
    console.log('✅ Final counts:');
    console.log(`   Sale items: ${saleItemsCount[0].count}`);
    console.log(`   Return items: ${returnItemsCount[0].count}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

fixSaleAndReturnItems();
