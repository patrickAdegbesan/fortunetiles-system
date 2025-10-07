'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Check if product_type_id column exists before removing it
    const productTableDescription = await queryInterface.describeTable('products');
    if (productTableDescription.product_type_id) {
      await queryInterface.removeColumn('products', 'product_type_id');
    }

    // Check if category column exists and change it to categories (JSONB array)
    if (productTableDescription.category) {
      // First, add the new categories column
      await queryInterface.addColumn('products', 'categories', {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: ['General']
      });
      
      // Copy data from category to categories (convert string to array)
      await queryInterface.sequelize.query(`
        UPDATE products SET categories = CASE 
          WHEN category IS NOT NULL THEN to_jsonb(ARRAY[category])
          ELSE '["General"]'::jsonb
        END;
      `);
      
      // Remove the old category column
      await queryInterface.removeColumn('products', 'category');
    }

    // Add unit_of_measure column if it doesn't exist
    if (!productTableDescription.unit_of_measure) {
      await queryInterface.addColumn('products', 'unit_of_measure', {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'pcs'
      });
    }

    // Rename custom_attributes to attributes if it exists
    if (productTableDescription.custom_attributes) {
      await queryInterface.renameColumn('products', 'custom_attributes', 'attributes');
    }

    // Drop product_types table if it exists
    const tables = await queryInterface.showAllTables();
    if (tables.includes('product_types')) {
      await queryInterface.dropTable('product_types');
    }
  },

  async down (queryInterface, Sequelize) {
    // Recreate product_types table
    await queryInterface.createTable('product_types', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
      },
      unit_of_measure: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      attributes: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // Remove new columns
    await queryInterface.removeColumn('products', 'unit_of_measure');

    // Rename categories back to category
    await queryInterface.renameColumn('products', 'categories', 'category');

    // Change categories back to string
    await queryInterface.changeColumn('products', 'category', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: 'General'
    });

    // Rename attributes back to custom_attributes
    await queryInterface.renameColumn('products', 'attributes', 'custom_attributes');

    // Add back productTypeId column
    await queryInterface.addColumn('products', 'product_type_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'product_types',
        key: 'id'
      }
    });
  }
};
