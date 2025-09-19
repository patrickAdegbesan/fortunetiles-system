const { sequelize } = require('./config/database');
const { Product } = require('./models');

// Correct pricing per square meter based on dimensions
const correctPricing = {
  '120x120': 35000,
  '60x120': 25000,
  '60x60': 21000,
  '30x60': 19000,
  '30x90': 19000,
  '25x80': 19000,
  '40x120': 23000,
  '30x150': 23000,
  '23x120': 22000,
  '20x75': 21000,
  '20x120': 22000,
  '25x100': 22000,
  '120x240': 55000,
  '120x260': 55000,
  '75x150': 35000,
  '90x180': 36000,
  '160x160': 45000,
  '79x159': 35000,
  '60x180': 35000,
  '90x90': 28000
};

// Calculate actual price based on sqm and size
const calculateTilePrice = (dimensions, pricePerSqm) => {
  const [width, height] = dimensions.split(/[x×]/).map(d => parseFloat(d.trim()));
  // Convert cm to m and calculate area (1cm = 0.01m)
  const widthInMeters = width / 100;
  const heightInMeters = height / 100;
  const areaPerTile = widthInMeters * heightInMeters; // Area in square meters
  
  // Calculate price based on price per square meter
  const price = Math.round(pricePerSqm * areaPerTile);
  
  // Ensure we have a valid price
  return price > 0 ? price : 1000;
};

async function updateTilePrices() {
  try {
    console.log('🔧 Starting tile price update...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Find all Spanish tiles (category = 'tiles' with product_type_id = 34)
    const spanishTiles = await Product.findAll({
      where: {
        category: 'tiles',
        product_type_id: 34
      }
    });

    console.log(`Found ${spanishTiles.length} Spanish tiles to update`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const tile of spanishTiles) {
      try {
        // Extract size from custom attributes
        const size = tile.customAttributes?.size;
        if (!size) {
          console.log(`⚠️  Skipping ${tile.name} - no size information`);
          skippedCount++;
          continue;
        }

        // Clean up the size format (remove spaces and normalize)
        const normalizedSize = size.replace(/\s+/g, '').replace('×', 'x').toLowerCase();
        
        // Find matching price
        let pricePerSqm = null;
        for (const [dimension, price] of Object.entries(correctPricing)) {
          if (normalizedSize === dimension.toLowerCase()) {
            pricePerSqm = price;
            break;
          }
        }

        if (!pricePerSqm) {
          console.log(`⚠️  Skipping ${tile.name} (${size}) - no price mapping found`);
          skippedCount++;
          continue;
        }

        // Calculate the correct price
        const correctPrice = calculateTilePrice(normalizedSize.replace('x', 'x'), pricePerSqm);
        
        // Update the product if price is different
        if (parseFloat(tile.price) !== correctPrice) {
          await tile.update({ price: correctPrice });
          console.log(`✅ Updated ${tile.name} (${size}): ₦${tile.price} → ₦${correctPrice}`);
          updatedCount++;
        } else {
          console.log(`✔️  ${tile.name} (${size}) already has correct price: ₦${correctPrice}`);
        }

      } catch (error) {
        console.error(`❌ Error updating ${tile.name}:`, error.message);
      }
    }

    console.log(`\n🎉 Price update completed!`);
    console.log(`📊 Summary:`);
    console.log(`   - Updated: ${updatedCount} tiles`);
    console.log(`   - Skipped: ${skippedCount} tiles`);
    console.log(`   - Total processed: ${spanishTiles.length} tiles`);

  } catch (error) {
    console.error('❌ Error updating tile prices:', error);
    throw error;
  }
}

// Run the updater if this file is being executed directly
if (require.main === module) {
  updateTilePrices()
    .then(() => {
      console.log('✅ Price update completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Price update failed:', error);
      process.exit(1);
    });
} else {
  module.exports = updateTilePrices;
}