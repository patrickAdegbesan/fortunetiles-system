const { Product } = require('./models');

(async () => {
  try {
    console.log('🔍 Debugging problematic tiles...');
    
    // Get the specific problematic tiles
    const problematicTileNames = [
      'Dart Graphite', 'Dart silver', 'Piazza grafito',
      'Martintque Azul', 'N.Carrat ', 'Rlu Dagma Blanco ', 
      'Slate Mix Rustico '
    ];

    for (const tileName of problematicTileNames) {
      const tile = await Product.findOne({
        where: { 
          name: tileName,
          category: 'tiles'
        }
      });

      if (tile) {
        console.log(`\n"${tile.name}":`);
        console.log(`  ID: ${tile.id}`);
        console.log(`  Price: ${tile.price} (type: ${typeof tile.price})`);
        console.log(`  Category: ${tile.category}`);
        console.log(`  Product Type ID: ${tile.product_type_id}`);
        console.log(`  Custom Attributes: ${tile.custom_attributes}`);
      } else {
        console.log(`❌ Tile "${tileName}" not found`);
      }
    }

    // Also check all tiles with very low prices
    console.log('\n--- ALL TILES WITH PRICE ≤ 10000 ---');
    const lowPriceTiles = await Product.findAll({
      where: { 
        category: 'tiles'
      },
      order: [['price', 'ASC']]
    });

    const veryLowPrice = lowPriceTiles.filter(tile => tile.price <= 10000);
    
    veryLowPrice.forEach(tile => {
      console.log(`"${tile.name}": ₦${tile.price} (ID: ${tile.id})`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
  
  process.exit(0);
})();