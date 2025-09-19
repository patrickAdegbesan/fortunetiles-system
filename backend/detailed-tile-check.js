const { Product } = require('./models');

(async () => {
  try {
    console.log('🔍 Detailed tile price analysis...');
    
    // Get all tiles
    const allTiles = await Product.findAll({
      where: { category: 'tiles' },
      order: [['name', 'ASC']]
    });

    console.log(`📊 Found ${allTiles.length} total tiles in database\n`);

    // Expected price ranges based on your specifications
    const expectedPrices = {
      19000: "30x60, 30x90, 25x80 tiles",
      21000: "60x60, 20x75 tiles", 
      22000: "23x120, 20x120, 25x100 tiles",
      23000: "40x120, 30x150 tiles",
      25000: "60x120 tiles",
      28000: "90x90 tiles",
      35000: "120x120, 75x150, 60x180, 79x159 tiles",
      36000: "90x180 tiles",
      45000: "160x160 tiles", 
      55000: "120x240, 120x260 tiles"
    };

    console.log('--- CURRENT PRICE DISTRIBUTION ---');
    const priceGroups = {};
    allTiles.forEach(tile => {
      const price = tile.price;
      if (!priceGroups[price]) priceGroups[price] = [];
      priceGroups[price].push(tile.name);
    });

    // Sort prices and show distribution
    Object.keys(priceGroups)
      .sort((a, b) => Number(a) - Number(b))
      .forEach(price => {
        const count = priceGroups[price].length;
        const isExpected = expectedPrices[price] ? '✅' : '❓';
        console.log(`${isExpected} ₦${Number(price).toLocaleString()}: ${count} tiles ${expectedPrices[price] || ''}`);
        
        // Show first few tile names for context
        if (count <= 3) {
          priceGroups[price].forEach(name => console.log(`    - "${name}"`));
        } else {
          console.log(`    - "${priceGroups[price][0]}", "${priceGroups[price][1]}" ... and ${count-2} more`);
        }
        console.log('');
      });

    console.log('--- EXPECTED VS ACTUAL PRICES ---');
    Object.keys(expectedPrices).forEach(expectedPrice => {
      const actualCount = priceGroups[expectedPrice] ? priceGroups[expectedPrice].length : 0;
      console.log(`₦${Number(expectedPrice).toLocaleString()} (${expectedPrices[expectedPrice]}): ${actualCount} tiles`);
    });

    console.log('\n--- SAMPLE TILES WITH FULL DATA ---');
    // Show 10 random tiles with all their attributes
    const sampleTiles = allTiles.slice(0, 10);
    sampleTiles.forEach(tile => {
      console.log(`"${tile.name}"`);
      console.log(`  Price: ₦${tile.price.toLocaleString()}`);
      console.log(`  Custom attributes: ${tile.custom_attributes}`);
      console.log(`  Category: ${tile.category}`);
      console.log(`  Product type ID: ${tile.product_type_id}`);
      console.log('---');
    });

    // Check for tiles that might need price adjustments based on your new pricing
    console.log('\n--- TILES WITH UNEXPECTED PRICES ---');
    const unexpectedPrices = Object.keys(priceGroups).filter(price => !expectedPrices[price]);
    
    if (unexpectedPrices.length > 0) {
      console.log('These prices are not in your expected list:');
      unexpectedPrices.forEach(price => {
        const count = priceGroups[price].length;
        console.log(`₦${Number(price).toLocaleString()}: ${count} tiles`);
        // Show a few examples
        priceGroups[price].slice(0, 3).forEach(name => console.log(`    - "${name}"`));
        if (count > 3) console.log(`    ... and ${count-3} more`);
      });
    } else {
      console.log('✅ All tiles have expected price ranges!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
  
  process.exit(0);
})();