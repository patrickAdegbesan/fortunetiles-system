const { sequelize } = require('../config/database');
const ProductType = require('../models/ProductType');

const initialProductTypes = [
  {
    name: 'Tiles',
    unitOfMeasure: 'sqm',
    attributes: {
      requiredFields: ['size', 'color', 'finish', 'thickness', 'grade'],
      optionalFields: ['pattern', 'material', 'usage']
    }
  },
  {
    name: 'Handwash Basins',
    unitOfMeasure: 'pcs',
    attributes: {
      requiredFields: ['material', 'color', 'dimensions'],
      optionalFields: ['style', 'mounting_type', 'tap_holes']
    }
  },
  {
    name: 'Water Cisterns',
    unitOfMeasure: 'pcs',
    attributes: {
      requiredFields: ['capacity', 'type', 'color'],
      optionalFields: ['material', 'flush_mechanism']
    }
  },
  {
    name: 'Bathroom Showers',
    unitOfMeasure: 'pcs',
    attributes: {
      requiredFields: ['type', 'material', 'finish'],
      optionalFields: ['spray_patterns', 'pressure_rating']
    }
  },
  {
    name: 'Luxury Baths',
    unitOfMeasure: 'pcs',
    attributes: {
      requiredFields: ['material', 'length', 'style'],
      optionalFields: ['color', 'features']
    }
  }
];

async function seedProductTypes() {
  try {
    for (const type of initialProductTypes) {
      await ProductType.findOrCreate({
        where: { name: type.name },
        defaults: type
      });
    }
    console.log('✅ Product types seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding product types:', error);
    throw error;
  }
}

async function migrateProductTypes() {
  try {
    // Drop existing table if it exists
    await sequelize.query('DROP TABLE IF EXISTS product_types CASCADE;');
    console.log('Dropped existing product_types table');

    // Create product_types table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS product_types (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        unit_of_measure VARCHAR(20) NOT NULL,
        attributes JSONB DEFAULT '{}',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add new columns to products table
    await sequelize.query(`
      DO $$ 
      BEGIN 
        -- Add product_type_id if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'products' AND column_name = 'product_type_id') THEN
          ALTER TABLE products 
          ADD COLUMN product_type_id INTEGER REFERENCES product_types(id);
        END IF;

        -- Add custom_attributes if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'products' AND column_name = 'custom_attributes') THEN
          ALTER TABLE products 
          ADD COLUMN custom_attributes JSONB DEFAULT '{}';
        END IF;

        -- Rename price_per_sqm to price if it exists
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'products' AND column_name = 'price_per_sqm') THEN
          ALTER TABLE products 
          RENAME COLUMN price_per_sqm TO price;
        END IF;
      END $$;
    `);

    // Sync ProductType model
    await ProductType.sync();
    console.log('ProductType model synced');

    // Seed initial product types
    await seedProductTypes();

    // Set default product type for existing products
    await sequelize.query(`
      UPDATE products 
      SET product_type_id = (SELECT id FROM product_types WHERE name = 'Tiles')
      WHERE product_type_id IS NULL;
    `);

    // Make product_type_id required
    await sequelize.query(`
      ALTER TABLE products 
      ALTER COLUMN product_type_id SET NOT NULL;
    `);

    console.log('✅ Product types migration completed successfully');
  } catch (error) {
    console.error('❌ Error in product types migration:', error);
    throw error;
  }
}

// Run the migration if this file is being executed directly
if (require.main === module) {
  migrateProductTypes()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
} else {
  module.exports = migrateProductTypes;
}
