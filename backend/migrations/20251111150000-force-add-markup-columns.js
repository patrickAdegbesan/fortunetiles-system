'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Use raw query to add columns if they don't exist
      await queryInterface.sequelize.query(`
        ALTER TABLE sale_items
        ADD COLUMN IF NOT EXISTS base_unit_price DECIMAL(10, 2),
        ADD COLUMN IF NOT EXISTS markup_price DECIMAL(10, 2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS markup_by INTEGER;
      `);
      console.log('Successfully added markup columns to sale_items');
    } catch (error) {
      console.error('Error adding markup columns:', error.message);
      throw error;
    }
  },

  down: async (queryInterface) => {
    try {
      await queryInterface.sequelize.query(`
        ALTER TABLE sale_items
        DROP COLUMN IF EXISTS base_unit_price,
        DROP COLUMN IF EXISTS markup_price,
        DROP COLUMN IF EXISTS markup_by;
      `);
      console.log('Successfully removed markup columns from sale_items');
    } catch (error) {
      console.error('Error removing markup columns:', error.message);
      throw error;
    }
  }
};
