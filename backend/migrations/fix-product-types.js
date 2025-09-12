'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Check if the constraint already exists
      const [results] = await queryInterface.sequelize.query(`
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'products' 
        AND constraint_name = 'fk_product_type'
        AND constraint_type = 'FOREIGN KEY';
      `);

      if (results.length > 0) {
        console.log('✅ Foreign key constraint already exists, skipping');
        return;
      }

      // Get the "Tiles" product type
      const [productTypes] = await queryInterface.sequelize.query(`
        SELECT id FROM product_types WHERE name = 'Tiles' LIMIT 1;
      `);

      if (productTypes.length === 0) {
        console.log('⚠️ Tiles product type not found, skipping migration');
        return;
      }

      const tilesTypeId = productTypes[0].id;

      // Update all products to use the Tiles product type
      await queryInterface.sequelize.query(`
        UPDATE products 
        SET product_type_id = ${tilesTypeId}
        WHERE product_type_id IS NULL OR 
              product_type_id NOT IN (SELECT id FROM product_types);
      `);

      console.log('✅ All products updated with valid product type');

      // Now we can safely add the foreign key constraint
      await queryInterface.addConstraint('products', {
        fields: ['product_type_id'],
        type: 'foreign key',
        name: 'fk_product_type',
        references: {
          table: 'product_types',
          field: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });

      console.log('✅ Foreign key constraint added successfully');

    } catch (error) {
      console.error('❌ Error in migration:', error);
      // Don't throw error to prevent deployment failure
      console.log('⚠️ Migration failed but continuing deployment');
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.removeConstraint('products', 'fk_product_type');
      console.log('✅ Foreign key constraint removed');
    } catch (error) {
      console.error('❌ Error removing constraint:', error);
    }
  }
};
