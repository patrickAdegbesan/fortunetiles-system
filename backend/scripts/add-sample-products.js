const { Product, Inventory, InventoryLog, Location } = require('../models');
const { sequelize } = require('../config/database');
require('dotenv').config();

const sampleProducts = [
  {
    name: 'Marble Tile - White Carrara',
    price: 45.99,
    categories: ['Marble', 'Premium'],
    unitOfMeasure: 'sqm',
    description: 'Premium white marble tiles with natural veining',
    attributes: {
      size: '60x60cm',
      finish: 'polished',
      thickness: '2cm'
    },
    quantity: 100
  },
  {
    name: 'Granite Tile - Black Absolute',
    price: 38.50,
    categories: ['Granite', 'Luxury'],
    unitOfMeasure: 'sqm',
    description: 'High-quality black granite with mirror finish',
    attributes: {
      size: '60x60cm',
      finish: 'polished',
      thickness: '2cm'
    },
    quantity: 150
  },
  {
    name: 'Ceramic Tile - Beige',
    price: 22.00,
    categories: ['Ceramic', 'General'],
    unitOfMeasure: 'sqm',
    description: 'Durable ceramic tiles for indoor use',
    attributes: {
      size: '30x30cm',
      finish: 'matte',
      thickness: '1cm'
    },
    quantity: 200
  },
  {
    name: 'Porcelain Tile - Light Gray',
    price: 28.75,
    categories: ['Porcelain', 'Premium'],
    unitOfMeasure: 'sqm',
    description: 'Stain-resistant porcelain tiles',
    attributes: {
      size: '45x45cm',
      finish: 'semi-gloss',
      thickness: '1.2cm'
    },
    quantity: 120
  },
  {
    name: 'Travertine Tile - Cream',
    price: 35.00,
    categories: ['Travertine', 'Luxury'],
    unitOfMeasure: 'sqm',
    description: 'Natural travertine with rustic appeal',
    attributes: {
      size: '60x60cm',
      finish: 'honed',
      thickness: '2.5cm'
    },
    quantity: 80
  },
  {
    name: 'Marble Mosaic - Mixed Colors',
    price: 52.00,
    categories: ['Marble', 'Luxury'],
    unitOfMeasure: 'sqm',
    description: 'Decorative marble mosaic tiles',
    attributes: {
      size: 'mixed',
      finish: 'polished',
      thickness: '1.5cm'
    },
    quantity: 60
  },
  {
    name: 'Granite Tile - Red Imperial',
    price: 42.00,
    categories: ['Granite', 'Premium'],
    unitOfMeasure: 'sqm',
    description: 'Rich red granite with gold flecks',
    attributes: {
      size: '60x60cm',
      finish: 'polished',
      thickness: '2cm'
    },
    quantity: 90
  },
  {
    name: 'Ceramic Tile - Navy Blue',
    price: 24.50,
    categories: ['Ceramic', 'General'],
    unitOfMeasure: 'sqm',
    description: 'Vibrant ceramic tiles for accent walls',
    attributes: {
      size: '30x30cm',
      finish: 'glossy',
      thickness: '1cm'
    },
    quantity: 110
  }
];

async function addProducts() {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Get the first location (or create one if none exists)
    let location = await Location.findOne();
    
    if (!location) {
      console.log('📍 No location found. Creating default location...');
      location = await Location.create({
        name: 'Main Warehouse',
        address: '123 Main Street, City, Country'
      });
      console.log('✅ Default location created:', location.id);
    } else {
      console.log('📍 Using existing location:', location.name, '(ID:', location.id + ')');
    }

    // Add products
    let addedCount = 0;
    for (const productData of sampleProducts) {
      const transaction = await sequelize.transaction();
      
      try {
        // Check if product already exists
        const existing = await Product.findOne({
          where: { name: productData.name }
        });

        if (existing) {
          console.log(`⏭️  Skipping "${productData.name}" - already exists`);
          continue;
        }

        // Create product
        const product = await Product.create({
          name: productData.name,
          price: productData.price,
          categories: productData.categories,
          unitOfMeasure: productData.unitOfMeasure,
          description: productData.description,
          attributes: productData.attributes,
          isActive: true
        }, { transaction });

        // Create inventory record
        await Inventory.create({
          productId: product.id,
          locationId: location.id,
          quantitySqm: productData.quantity
        }, { transaction });

        // Log the inventory creation
        await InventoryLog.create({
          productId: product.id,
          locationId: location.id,
          changeType: 'initial',
          changeAmount: productData.quantity,
          previousQuantity: 0,
          newQuantity: productData.quantity,
          notes: 'Initial product seeding'
        }, { transaction });

        await transaction.commit();
        console.log(`✅ Added: ${productData.name} (${productData.quantity} ${productData.unitOfMeasure})`);
        addedCount++;
      } catch (error) {
        await transaction.rollback();
        console.error(`❌ Error adding "${productData.name}":`, error.message);
      }
    }

    console.log(`\n🎉 Successfully added ${addedCount} products!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addProducts();
