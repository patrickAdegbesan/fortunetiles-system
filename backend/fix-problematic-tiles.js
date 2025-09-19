const { Product } = require('./models');

(async () => {
  try {
    console.log('🔧 Fixing problematic tile prices...');
    
    // Get all tiles with problematic pricing
    const problematicTiles = await Product.findAll({
      where: { 
        category: 'tiles',
        price: [1, 3420, 5130] // The problematic prices we found
      },
      order: [['name', 'ASC']]
    });

    console.log(`📊 Found ${problematicTiles.length} tiles with problematic pricing\n`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const tile of problematicTiles) {
      try {
        let newPrice;
        let reason;

        // Determine appropriate price based on tile name and patterns
        const tileName = tile.name.toLowerCase();
        
        if (tile.price === 1) {
          // These seem to be test tiles that got wrong pricing
          if (tileName.includes('dart') && tileName.includes('graphite')) {
            newPrice = 28000; // Assuming 90x90 size
            reason = 'Dart Graphite -> 90x90 pricing';
          } else if (tileName.includes('dart') && tileName.includes('silver')) {
            newPrice = 28000; // Assuming 90x90 size
            reason = 'Dart Silver -> 90x90 pricing';
          } else if (tileName.includes('piazza') && tileName.includes('grafito')) {
            newPrice = 21000; // Assuming 60x60 size
            reason = 'Piazza Grafito -> 60x60 pricing';
          } else {
            newPrice = 21000; // Default to 60x60 pricing
            reason = 'Default to 60x60 pricing';
          }
        } else if (tile.price === 3420) {
          // This appears to be a 30x60 tile based on the old pricing pattern
          newPrice = 19000;
          reason = 'Slate Mix Rustico -> 30x60 pricing';
        } else if (tile.price === 5130) {
          // These appear to be 30x90 tiles based on the old pricing pattern
          newPrice = 19000;
          reason = '30x90 tiles -> corrected pricing';
        }

        // Update the tile
        await Product.update(
          { price: newPrice },
          { where: { id: tile.id } }
        );

        console.log(`✅ Updated "${tile.name}": ₦${tile.price.toLocaleString()} → ₦${newPrice.toLocaleString()} (${reason})`);
        updatedCount++;

      } catch (error) {
        console.error(`❌ Error updating "${tile.name}":`, error.message);
        errorCount++;
      }
    }

    console.log('\n--- ADDITIONAL CHECKS ---');
    
    // Check for tiles that might need the missing price tiers (22000, 23000)
    // Look for tiles with specific size patterns in their names
    const allTiles = await Product.findAll({
      where: { category: 'tiles' },
      order: [['name', 'ASC']]
    });

    console.log('\nLooking for tiles that might need ₦22,000 or ₦23,000 pricing...');
    
    let potentialUpdates = [];
    
    allTiles.forEach(tile => {
      const name = tile.name.toLowerCase();
      // Look for size patterns that might indicate different pricing needs
      
      // Check for potential 23x120, 20x120, 25x100 tiles (₦22,000)
      if (name.includes('23x120') || name.includes('20x120') || name.includes('25x100') ||
          name.includes('23 x 120') || name.includes('20 x 120') || name.includes('25 x 100')) {
        if (tile.price !== 22000) {
          potentialUpdates.push({
            tile,
            suggestedPrice: 22000,
            reason: 'Size suggests 22k pricing (23x120, 20x120, or 25x100)'
          });
        }
      }
      
      // Check for potential 40x120, 30x150 tiles (₦23,000)
      if (name.includes('40x120') || name.includes('30x150') ||
          name.includes('40 x 120') || name.includes('30 x 150')) {
        if (tile.price !== 23000) {
          potentialUpdates.push({
            tile,
            suggestedPrice: 23000,
            reason: 'Size suggests 23k pricing (40x120 or 30x150)'
          });
        }
      }
    });

    if (potentialUpdates.length > 0) {
      console.log(`\nFound ${potentialUpdates.length} tiles that might need price adjustments:`);
      potentialUpdates.forEach(({ tile, suggestedPrice, reason }) => {
        console.log(`⚠️  "${tile.name}" (currently ₦${tile.price.toLocaleString()}) -> suggested ₦${suggestedPrice.toLocaleString()} (${reason})`);
      });
      console.log('\nThese were not automatically updated. Review them manually if needed.');
    } else {
      console.log('✅ No tiles found that clearly need ₦22,000 or ₦23,000 pricing based on name patterns.');
    }

    console.log('\n📈 FINAL SUMMARY:');
    console.log(`   ✅ Fixed: ${updatedCount} problematic tiles`);
    console.log(`   ❌ Errors: ${errorCount} tiles`);
    
    if (updatedCount > 0) {
      console.log('\n🎉 Problematic tile prices have been fixed!');
      
      // Show updated price distribution
      console.log('\n--- UPDATED PRICE DISTRIBUTION ---');
      const finalTiles = await Product.findAll({
        where: { category: 'tiles' },
        order: [['price', 'ASC']]
      });

      const priceGroups = {};
      finalTiles.forEach(tile => {
        const price = tile.price;
        if (!priceGroups[price]) priceGroups[price] = 0;
        priceGroups[price]++;
      });

      Object.keys(priceGroups)
        .sort((a, b) => Number(a) - Number(b))
        .forEach(price => {
          console.log(`₦${Number(price).toLocaleString()}: ${priceGroups[price]} tiles`);
        });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
  
  process.exit(0);
})();