'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if columns already exist
    const table = await queryInterface.describeTable('sale_items');
    console.log('Current sale_items table columns:', Object.keys(table));

    // Force add columns (remove existing checks to ensure they exist)
    try {
      await queryInterface.addColumn('sale_items', 'base_unit_price', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: null,
        comment: 'Original product price at time of sale'
      });
      console.log('Added base_unit_price column');
    } catch (error) {
      console.log('base_unit_price column already exists or error:', error.message);
    }

    try {
      await queryInterface.addColumn('sale_items', 'markup_price', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Additional amount added by contractor/middleman'
      });
      console.log('Added markup_price column');
    } catch (error) {
      console.log('markup_price column already exists or error:', error.message);
    }

    try {
      await queryInterface.addColumn('sale_items', 'markup_by', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        comment: 'User ID of contractor who added the markup'
      });
      console.log('Added markup_by column');

      // Add index for faster queries
      await queryInterface.addIndex('sale_items', ['markup_by']);
      console.log('Added markup_by index');
    } catch (error) {
      console.log('markup_by column/index already exists or error:', error.message);
    }
  },

  down: async (queryInterface) => {
    const table = await queryInterface.describeTable('sale_items');
    
    if (table.markup_by) {
      await queryInterface.removeIndex('sale_items', ['markup_by']);
      await queryInterface.removeColumn('sale_items', 'markup_by');
    }
    
    if (table.markup_price) {
      await queryInterface.removeColumn('sale_items', 'markup_price');
    }
    
    if (table.base_unit_price) {
      await queryInterface.removeColumn('sale_items', 'base_unit_price');
    }
  }
};
