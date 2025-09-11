const { sequelize } = require('./config/database');
const { User, Location, Product, Inventory, Sale, SaleItem, InventoryLog } = require('./models');

async function seedDatabase() {
  try {
    console.log('Starting database seeding...');

    // Create sample products
    const products = await Product.bulkCreate([
      {
        name: 'Marble White Classic',
        size: '60x60',
        color: 'White',
        finish: 'Polished',
        pricePerSqm: 2500,
        supplierCode: 'MWC-001'
      },
      {
        name: 'Granite Black Premium',
        size: '80x80',
        color: 'Black',
        finish: 'Matte',
        pricePerSqm: 3200,
        supplierCode: 'GBP-002'
      },
      {
        name: 'Ceramic Blue Ocean',
        size: '30x60',
        color: 'Blue',
        finish: 'Glossy',
        pricePerSqm: 1800,
        supplierCode: 'CBO-003'
      },
      {
        name: 'Porcelain Grey Stone',
        size: '60x120',
        color: 'Grey',
        finish: 'Textured',
        pricePerSqm: 2800,
        supplierCode: 'PGS-004'
      },
      {
        name: 'Travertine Beige Natural',
        size: '40x40',
        color: 'Beige',
        finish: 'Natural',
        pricePerSqm: 2200,
        supplierCode: 'TBN-005'
      }
    ]);

    console.log('Products created:', products.length);

    // Get the main warehouse location (should exist from server.js)
    let mainWarehouse = await Location.findOne({ where: { name: 'Main Warehouse' } });
    if (!mainWarehouse) {
      mainWarehouse = await Location.create({
        name: 'Main Warehouse',
        address: '123 Industrial Area, Lagos'
      });
    }

    // Create showroom location
    let showroom = await Location.findOne({ where: { name: 'Lagos Showroom' } });
    if (!showroom) {
      showroom = await Location.create({
        name: 'Lagos Showroom',
        address: '456 Victoria Island, Lagos'
      });
    }

    console.log('Locations ready');

    // Create inventory for products
    const inventoryData = [
      { productId: products[0].id, locationId: mainWarehouse.id, quantitySqm: 150 },
      { productId: products[0].id, locationId: showroom.id, quantitySqm: 50 },
      { productId: products[1].id, locationId: mainWarehouse.id, quantitySqm: 80 },
      { productId: products[1].id, locationId: showroom.id, quantitySqm: 20 },
      { productId: products[2].id, locationId: mainWarehouse.id, quantitySqm: 200 },
      { productId: products[2].id, locationId: showroom.id, quantitySqm: 75 },
      { productId: products[3].id, locationId: mainWarehouse.id, quantitySqm: 60 }, // Low stock
      { productId: products[3].id, locationId: showroom.id, quantitySqm: 15 }, // Low stock
      { productId: products[4].id, locationId: mainWarehouse.id, quantitySqm: 120 },
      { productId: products[4].id, locationId: showroom.id, quantitySqm: 40 }
    ];

    await Inventory.bulkCreate(inventoryData);
    console.log('Inventory created');

    // Get admin user
    const adminUser = await User.findOne({ where: { email: 'admin@fortunetiles.com' } });

    // Create sample sales
    const sale1 = await Sale.create({
      customerName: 'ABC Construction Ltd',
      totalAmount: 125000,
      locationId: showroom.id,
      userId: adminUser.id
    });

    const sale2 = await Sale.create({
      customerName: 'XYZ Interior Design',
      totalAmount: 89600,
      locationId: showroom.id,
      userId: adminUser.id
    });

    const sale3 = await Sale.create({
      customerName: 'Home Renovation Co',
      totalAmount: 156000,
      locationId: mainWarehouse.id,
      userId: adminUser.id
    });

    // Create sale items
    await SaleItem.bulkCreate([
      // Sale 1 items
      { saleId: sale1.id, productId: products[0].id, quantitySqm: 30, unitPrice: 2500, lineTotal: 75000 },
      { saleId: sale1.id, productId: products[2].id, quantitySqm: 25, unitPrice: 1800, lineTotal: 45000 },
      { saleId: sale1.id, productId: products[4].id, quantitySqm: 2.5, unitPrice: 2200, lineTotal: 5500 },
      
      // Sale 2 items
      { saleId: sale2.id, productId: products[1].id, quantitySqm: 20, unitPrice: 3200, lineTotal: 64000 },
      { saleId: sale2.id, productId: products[3].id, quantitySqm: 8, unitPrice: 2800, lineTotal: 22400 },
      { saleId: sale2.id, productId: products[2].id, quantitySqm: 1.8, unitPrice: 1800, lineTotal: 3240 },
      
      // Sale 3 items
      { saleId: sale3.id, productId: products[0].id, quantitySqm: 40, unitPrice: 2500, lineTotal: 100000 },
      { saleId: sale3.id, productId: products[1].id, quantitySqm: 15, unitPrice: 3200, lineTotal: 48000 },
      { saleId: sale3.id, productId: products[4].id, quantitySqm: 3.6, unitPrice: 2200, lineTotal: 8000 }
    ]);

    console.log('Sales and sale items created');

    // Create some inventory logs for recent activity
    await InventoryLog.bulkCreate([
      {
        productId: products[0].id,
        locationId: showroom.id,
        changeType: 'sale',
        changeAmount: -30,
        previousQuantity: 80,
        newQuantity: 50,
        notes: 'Sale to ABC Construction Ltd',
        userId: adminUser.id
      },
      {
        productId: products[1].id,
        locationId: showroom.id,
        changeType: 'sale',
        changeAmount: -20,
        previousQuantity: 40,
        newQuantity: 20,
        notes: 'Sale to XYZ Interior Design',
        userId: adminUser.id
      },
      {
        productId: products[2].id,
        locationId: mainWarehouse.id,
        changeType: 'restock',
        changeAmount: 50,
        previousQuantity: 150,
        newQuantity: 200,
        notes: 'New shipment received',
        userId: adminUser.id
      },
      {
        productId: products[3].id,
        locationId: mainWarehouse.id,
        changeType: 'adjustment',
        changeAmount: -5,
        previousQuantity: 65,
        newQuantity: 60,
        notes: 'Damaged tiles removed',
        userId: adminUser.id
      },
      {
        productId: products[4].id,
        locationId: showroom.id,
        changeType: 'sale',
        changeAmount: -10,
        previousQuantity: 50,
        newQuantity: 40,
        notes: 'Sale to Home Renovation Co',
        userId: adminUser.id
      }
    ]);

    console.log('Inventory logs created');
    console.log('Database seeding completed successfully!');

    // Display summary
    const totalProducts = await Product.count();
    const totalInventory = await Inventory.sum('quantitySqm');
    const totalSales = await Sale.sum('totalAmount');
    const lowStockItems = await Inventory.count({
      where: { quantitySqm: { [require('sequelize').Op.lt]: 100 } }
    });

    console.log('\n=== DATABASE SUMMARY ===');
    console.log(`Total Products: ${totalProducts}`);
    console.log(`Total Inventory: ${totalInventory} sqm`);
    console.log(`Total Sales: ₦${totalSales?.toLocaleString() || 0}`);
    console.log(`Low Stock Items: ${lowStockItems}`);
    console.log('========================\n');

  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

// Run if called directly
if (require.main === module) {
  seedDatabase().then(() => {
    process.exit(0);
  });
}

module.exports = { seedDatabase };
