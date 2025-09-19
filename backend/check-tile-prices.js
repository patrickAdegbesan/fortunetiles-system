const { Product } = require('./models');

(async () => {
  try {
    console.log('🔍 Checking tile prices in database...');
    
    // Get all tiles
    const allTiles = await Product.findAll({
      where: { category: 'tiles' },
      order: [['name', 'ASC']]
    });

    console.log(`📊 Found ${allTiles.length} total tiles in database`);
    
    // Show first 50 tiles with details
    const tiles = allTiles.slice(0, 50);
    console.log('\n--- FIRST 50 TILE PRICES ---');
    
    tiles.forEach(tile => {
      const customAttrs = JSON.parse(tile.custom_attributes || '{}');
      const size = customAttrs.size || 'No size';
      console.log(`"${tile.name}" (${size}): ₦${tile.price.toLocaleString()}`);
    });

    console.log('\n--- PRICE DISTRIBUTION (ALL TILES) ---');
    const priceGroups = {};
    allTiles.forEach(tile => {
      const price = tile.price;
      if (!priceGroups[price]) priceGroups[price] = 0;
      priceGroups[price]++;
    });

    Object.keys(priceGroups)
      .sort((a, b) => Number(a) - Number(b))
      .forEach(price => {
        console.log(`₦${Number(price).toLocaleString()}: ${priceGroups[price]} tiles`);
      });

    // Check for specific prices mentioned by user
    console.log('\n--- VERIFICATION OF TARGET PRICES ---');
    const targetPrices = [19000, 21000, 22000, 23000, 25000, 28000, 35000, 36000, 45000, 55000];
    
    targetPrices.forEach(targetPrice => {
      const count = priceGroups[targetPrice] || 0;
      console.log(`₦${targetPrice.toLocaleString()}: ${count} tiles`);
    });

    console.log('\n--- TILES WITH POTENTIALLY INCORRECT PRICES ---');
    const correctPrices = new Set(targetPrices);
    
    let incorrectCount = 0;
    allTiles.forEach(tile => {
      if (!correctPrices.has(tile.price)) {
        const customAttrs = JSON.parse(tile.custom_attributes || '{}');
        const size = customAttrs.size || 'No size';
        console.log(`❌ "${tile.name}" (${size}): ₦${tile.price.toLocaleString()}`);
        incorrectCount++;
      }
    });

    console.log(`\n📈 SUMMARY:`);
    console.log(`   Total tiles: ${allTiles.length}`);
    console.log(`   Tiles with correct pricing: ${allTiles.length - incorrectCount}`);
    console.log(`   Tiles with incorrect pricing: ${incorrectCount}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
  
  process.exit(0);
})();