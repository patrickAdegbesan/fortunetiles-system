const { sequelize } = require('./config/database');
const ProductType = require('./models/ProductType');

const comprehensiveProductTypes = [
  {
    name: 'Tiles',
    unitOfMeasure: 'sqm',
    attributes: {
      requiredFields: ['size', 'color', 'finish', 'thickness', 'grade'],
      optionalFields: ['pattern', 'material', 'usage', 'slip_resistance', 'frost_resistance']
    }
  },
  {
    name: 'Handwash Basins',
    unitOfMeasure: 'pcs',
    attributes: {
      requiredFields: ['material', 'color', 'dimensions', 'style'],
      optionalFields: ['mounting_type', 'tap_holes', 'overflow', 'brand', 'model', 'weight']
    }
  },
  {
    name: 'Water Cisterns / WC',
    unitOfMeasure: 'pcs',
    attributes: {
      requiredFields: ['capacity', 'type', 'color', 'flush_mechanism'],
      optionalFields: ['material', 'dual_flush', 'water_efficiency', 'brand', 'model', 'height', 'rough_in']
    }
  },
  {
    name: 'Basin Mixers',
    unitOfMeasure: 'pcs',
    attributes: {
      requiredFields: ['finish', 'type', 'spout_height', 'handle_type'],
      optionalFields: ['installation_type', 'flow_rate', 'pressure_rating', 'brand', 'model', 'warranty', 'aerator']
    }
  },
  {
    name: 'Bathroom Showers',
    unitOfMeasure: 'pcs',
    attributes: {
      requiredFields: ['type', 'material', 'finish', 'spray_patterns'],
      optionalFields: ['pressure_rating', 'flow_rate', 'installation_type', 'brand', 'model', 'warranty', 'anti_lime']
    }
  },
  {
    name: 'Bathroom Accessories',
    unitOfMeasure: 'pcs',
    attributes: {
      requiredFields: ['material', 'finish', 'mounting_type', 'dimensions'],
      optionalFields: ['style', 'brand', 'model', 'weight', 'installation_hardware', 'warranty']
    }
  },
  {
    name: 'Luxury Baths',
    unitOfMeasure: 'pcs',
    attributes: {
      requiredFields: ['material', 'length', 'style', 'capacity'],
      optionalFields: ['color', 'features', 'brand', 'model', 'weight', 'drain_type', 'overflow_type', 'warranty']
    }
  },
  {
    name: 'Toilet Seats',
    unitOfMeasure: 'pcs',
    attributes: {
      requiredFields: ['material', 'color', 'shape', 'hinge_type'],
      optionalFields: ['soft_close', 'quick_release', 'brand', 'model', 'weight', 'warranty']
    }
  },
  {
    name: 'Bathroom Mirrors',
    unitOfMeasure: 'pcs',
    attributes: {
      requiredFields: ['dimensions', 'shape', 'mounting_type'],
      optionalFields: ['frame_material', 'frame_finish', 'lighting', 'brand', 'model', 'weight', 'warranty']
    }
  },
  {
    name: 'Bathroom Cabinets',
    unitOfMeasure: 'pcs',
    attributes: {
      requiredFields: ['material', 'dimensions', 'finish', 'door_type'],
      optionalFields: ['shelves', 'mounting_type', 'handles', 'brand', 'model', 'weight', 'warranty']
    }
  }
];

async function seedProductTypes() {
  try {
    console.log('🌱 Starting product types seeding...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Sync ProductType model
    await ProductType.sync();
    console.log('✅ ProductType model synced');

    let createdCount = 0;
    let updatedCount = 0;

    for (const typeData of comprehensiveProductTypes) {
      const [productType, created] = await ProductType.findOrCreate({
        where: { name: typeData.name },
        defaults: typeData
      });

      if (created) {
        createdCount++;
        console.log(`✅ Created: ${typeData.name}`);
      } else {
        // Update existing product type with new attributes
        await productType.update({
          unitOfMeasure: typeData.unitOfMeasure,
          attributes: typeData.attributes
        });
        updatedCount++;
        console.log(`🔄 Updated: ${typeData.name}`);
      }
    }

    console.log(`\n🎉 Product types seeding completed!`);
    console.log(`📊 Summary:`);
    console.log(`   - Created: ${createdCount} new product types`);
    console.log(`   - Updated: ${updatedCount} existing product types`);
    console.log(`   - Total: ${comprehensiveProductTypes.length} product types processed`);

  } catch (error) {
    console.error('❌ Error seeding product types:', error);
    throw error;
  }
}

// Run the seeder if this file is being executed directly
if (require.main === module) {
  seedProductTypes()
    .then(() => {
      console.log('✅ Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
} else {
  module.exports = seedProductTypes;
}