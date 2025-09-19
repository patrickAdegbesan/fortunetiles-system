const { sequelize } = require('./config/database');
const { Product } = require('./models');

// Correct pricing structure based on user requirements
const correctPricing = {
  '120 × 120': 35000,
  '120x120': 35000,
  '120*120': 35000,
  '119x119': 35000,
  '119 by 119': 35000,
  '120 by 120': 35000,
  '120 x 120': 35000,
  
  '60 × 120': 25000,
  '60x120': 25000,
  '60 by 120': 25000,
  '60 x 120': 25000,
  
  '60 × 60': 21000,
  '60x60': 21000,
  '60.5 × 60.5': 21000,
  '60.5 x 60.5': 21000,
  '60.8 × 60.8': 21000,
  '61x61': 21000,
  '59x59': 21000,
  
  '30 × 60': 19000,
  '30x60': 19000,
  
  '30 × 90': 19000,
  '30x90': 19000,
  '30 x 90': 19000,
  '30 by 90': 19000,
  '31.6 × 60': 19000,
  
  '25 × 80': 19000,
  '25x80': 19000,
  '25 X 80': 19000,
  '25 × 50': 19000,
  
  '40 × 120': 23000,
  '40x120': 23000,
  
  '30 × 150': 23000,
  '30x150': 23000,
  
  '23 × 120': 22000,
  '23x120': 22000,
  
  '20 × 75': 21000,
  '20 X 75': 21000,
  '20x75': 21000,
  
  '20 × 120': 22000,
  '20x120': 22000,
  
  '25 × 100': 22000,
  '25x100': 22000,
  
  '120 × 240': 55000,
  '120x240': 55000,
  '120*240': 55000,
  
  '120 × 260': 55000,
  '120x260': 55000,
  
  '120 × 280': 55000,
  '120x280': 55000,
  
  '75 × 150': 35000,
  '75x150': 35000,
  '75 x 150': 35000,
  
  '90 × 180': 36000,
  '90x180': 36000,
  '90 x 180': 36000,
  
  '160 × 160': 45000,
  '160x160': 45000,
  
  '79 × 159': 35000,
  '79x159': 35000,
  
  '60 × 180': 35000,
  '60x180': 35000,
  
  '90 × 90': 28000,
  '90x90': 28000,
  
  // Special 2cm thick tiles - keeping existing prices as they seem correct
  '60 × 60 (2cm)': 35000,
  '60 × 90 (2cm)': 45000,
  
  // Unknown/unclear sizes - will be flagged for manual review
  '60x90': null, // Need manual review
  '': null // Empty size field
};

async function updateTilePrices() {
  try {
    console.log('🔧 Starting tile price update...');
    
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Get all tiles
    const tiles = await Product.findAll({
      where: { category: 'tiles' },
      attributes: ['id', 'name', 'price', 'customAttributes']
    });

    console.log(`📊 Found ${tiles.length} tiles to process`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors = [];
    const skipped = [];

    // Process each tile
    for (const tile of tiles) {
      try {
        const size = tile.customAttributes?.size;
        const currentPrice = parseFloat(tile.price);
        
        if (!size) {
          skipped.push({
            name: tile.name,
            reason: 'No size attribute'
          });
          skippedCount++;
          continue;
        }

        const correctPrice = correctPricing[size];
        
        if (correctPrice === null) {
          skipped.push({
            name: tile.name,
            size: size,
            reason: 'Size needs manual review'
          });
          skippedCount++;
          continue;
        }

        if (!correctPrice) {
          skipped.push({
            name: tile.name,
            size: size,
            reason: 'No pricing rule for this size'
          });
          skippedCount++;
          continue;
        }

        if (currentPrice !== correctPrice) {
          await tile.update({ price: correctPrice });
          console.log(`✅ Updated "${tile.name}" (${size}): ${currentPrice} → ${correctPrice}`);
          updatedCount++;
        } else {
          console.log(`⏭️  "${tile.name}" (${size}): Already correct (${currentPrice})`);
        }

      } catch (error) {
        errors.push({
          name: tile.name,
          error: error.message
        });
        errorCount++;
        console.error(`❌ Error updating "${tile.name}":`, error.message);
      }
    }

    // Summary
    console.log('\n📈 UPDATE SUMMARY:');
    console.log(`   ✅ Updated: ${updatedCount} tiles`);
    console.log(`   ⏭️  Skipped: ${skippedCount} tiles`);
    console.log(`   ❌ Errors: ${errorCount} tiles`);

    if (skipped.length > 0) {
      console.log('\n⏭️  SKIPPED TILES:');
      skipped.forEach(item => {
        console.log(`   - "${item.name}" ${item.size ? `(${item.size})` : ''}: ${item.reason}`);
      });
    }

    if (errors.length > 0) {
      console.log('\n❌ ERRORS:');
      errors.forEach(item => {
        console.log(`   - "${item.name}": ${item.error}`);
      });
    }

    console.log('\n🎉 Tile price update completed!');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run the update if this file is executed directly
if (require.main === module) {
  updateTilePrices()
    .then(() => {
      console.log('✅ Update completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Update failed:', error);
      process.exit(1);
    });
} else {
  module.exports = updateTilePrices;
}
