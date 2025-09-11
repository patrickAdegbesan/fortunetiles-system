const { sequelize } = require('../config/database');
const Product = require('../models/Product');
const ProductType = require('../models/ProductType');

async function fixProductTypes() {
  try {
    // Get the "Tiles" product type
    const tilesType = await ProductType.findOne({
      where: { name: 'Tiles' }
    });

    if (!tilesType) {
      throw new Error('Tiles product type not found');
    }

    // Update all products to use the Tiles product type
    await sequelize.query(`
      UPDATE products 
      SET product_type_id = ${tilesType.id}
      WHERE product_type_id IS NULL OR 
            product_type_id NOT IN (SELECT id FROM product_types);
    `);

    console.log('✅ All products updated with valid product type');

    // Now we can safely add the foreign key constraint
    await sequelize.query(`
      ALTER TABLE products 
      ADD CONSTRAINT fk_product_type 
      FOREIGN KEY (product_type_id) 
      REFERENCES product_types(id);
    `);

    console.log('✅ Foreign key constraint added successfully');

  } catch (error) {
    console.error('❌ Error fixing product types:', error);
    throw error;
  }
}

// Run the migration if this file is being executed directly
if (require.main === module) {
  fixProductTypes()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
} else {
  module.exports = fixProductTypes;
}
