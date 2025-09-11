const { sequelize } = require('./config/database');
const { User, Location, Product, Inventory, Sale, SaleItem, InventoryLog } = require('./models');

async function quickSeed() {
  try {
    console.log('Quick seeding database...');

    // Check if products exist
    const productCount = await Product.count();
    console.log(`Current products: ${productCount}`);

    if (productCount === 0) {
      // Create products
      const products = await Product.bulkCreate([
        { name: 'Marble White Classic', size: '60x60', color: 'White', finish: 'Polished', pricePerSqm: 2500, supplierCode: 'MWC-001' },
        { name: 'Granite Black Premium', size: '80x80', color: 'Black', finish: 'Matte', pricePerSqm: 3200, supplierCode: 'GBP-002' },
        { name: 'Ceramic Blue Ocean', size: '30x60', color: 'Blue', finish: 'Glossy', pricePerSqm: 1800, supplierCode: 'CBO-003' },
        { name: 'Porcelain Grey Stone', size: '60x120', color: 'Grey', finish: 'Textured', pricePerSqm: 2800, supplierCode: 'PGS-004' },
        { name: 'Travertine Beige Natural', size: '40x40', color: 'Beige', finish: 'Natural', pricePerSqm: 2200, supplierCode: 'TBN-005' }
      ]);
      console.log(`Created ${products.length} products`);
    }

    // Get locations
    let locations = await Location.findAll();
    if (locations.length === 0) {
      locations = await Location.bulkCreate([
        { name: 'Main Warehouse', address: '123 Industrial Area, Lagos' },
        { name: 'Lagos Showroom', address: '456 Victoria Island, Lagos' }
      ]);
      console.log(`Created ${locations.length} locations`);
    }

    // Get all products and locations
    const allProducts = await Product.findAll();
    const warehouse = locations.find(l => l.name.includes('Warehouse')) || locations[0];
    const showroom = locations.find(l => l.name.includes('Showroom')) || locations[1] || locations[0];

    // Check if inventory exists
    const inventoryCount = await Inventory.count();
    console.log(`Current inventory items: ${inventoryCount}`);

    if (inventoryCount === 0) {
      // Create inventory
      const inventoryData = [];
      allProducts.forEach(product => {
        inventoryData.push(
          { productId: product.id, locationId: warehouse.id, quantitySqm: 150 },
          { productId: product.id, locationId: showroom.id, quantitySqm: 75 }
        );
      });

      await Inventory.bulkCreate(inventoryData);
      console.log(`Created ${inventoryData.length} inventory items`);
    }

    // Summary
    const finalProductCount = await Product.count();
    const finalInventoryCount = await Inventory.count();
    const finalLocationCount = await Location.count();

    console.log('\n=== SEEDING COMPLETE ===');
    console.log(`Products: ${finalProductCount}`);
    console.log(`Locations: ${finalLocationCount}`);
    console.log(`Inventory items: ${finalInventoryCount}`);
    console.log('========================');

  } catch (error) {
    console.error('Seeding error:', error);
  }
}

quickSeed().then(() => {
  console.log('Quick seed completed');
  process.exit(0);
}).catch(error => {
  console.error('Quick seed failed:', error);
  process.exit(1);
});
