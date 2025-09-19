const { Product } = require('./models');

(async () => {
  try {
    console.log('🔧 Fixing problematic tile prices (corrected for string prices)...');
    
    // Define the problematic tiles with their fixes
    const tileFixes = [
      { id: 224, name: 'Dart Graphite', newPrice: 28000, reason: 'Dart Graphite -> 90x90 pricing' },
      { id: 222, name: 'Dart silver', newPrice: 28000, reason: 'Dart Silver -> 90x90 pricing' },
      { id: 221, name: 'Piazza grafito', newPrice: 21000, reason: 'Piazza Grafito -> 60x60 pricing' },
      { id: 87, name: 'Slate Mix Rustico ', newPrice: 19000, reason: 'Slate Mix Rustico -> 30x60 pricing' },
      { id: 99, name: 'Martintque Azul', newPrice: 19000, reason: 'Martintque Azul -> 30x90 pricing' },
      { id: 133, name: 'Rlu Dagma Blanco ', newPrice: 19000, reason: 'Rlu Dagma Blanco -> 30x90 pricing' },
      { id: 106, name: 'N.Carrat ', newPrice: 19000, reason: 'N.Carrat -> 30x90 pricing' }
    ];

    console.log(`📊 Found ${tileFixes.length} tiles to fix\n`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const fix of tileFixes) {
      try {
        // Get current tile data
        const tile = await Product.findByPk(fix.id);
        const oldPrice = parseFloat(tile.price);

        // Update the tile
        await Product.update(
          { price: fix.newPrice },
          { where: { id: fix.id } }
        );

        console.log(`✅ Updated "${fix.name}": ₦${oldPrice.toLocaleString()} → ₦${fix.newPrice.toLocaleString()} (${fix.reason})`);
        updatedCount++;

      } catch (error) {
        console.error(`❌ Error updating "${fix.name}":`, error.message);
        errorCount++;
      }
    }

    console.log('\n📈 SUMMARY:');
    console.log(`   ✅ Fixed: ${updatedCount} problematic tiles`);
    console.log(`   ❌ Errors: ${errorCount} tiles`);
    
    if (updatedCount > 0) {
      console.log('\n🎉 Problematic tile prices have been fixed!');
      
      // Show final price distribution
      console.log('\n--- FINAL PRICE DISTRIBUTION ---');
      const allTiles = await Product.findAll({
        where: { category: 'tiles' },
        order: [['price', 'ASC']]
      });

      const priceGroups = {};
      allTiles.forEach(tile => {
        const price = parseFloat(tile.price);
        if (!priceGroups[price]) priceGroups[price] = 0;
        priceGroups[price]++;
      });

      Object.keys(priceGroups)
        .sort((a, b) => Number(a) - Number(b))
        .forEach(price => {
          const count = priceGroups[price];
          console.log(`₦${Number(price).toLocaleString()}: ${count} tiles`);
        });

      console.log(`\n📊 Total tiles: ${allTiles.length}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
  
  process.exit(0);
})();