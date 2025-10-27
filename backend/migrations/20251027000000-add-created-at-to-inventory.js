'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if the inventory table exists
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('inventory')) {
      console.log('Inventory table does not exist, skipping migration');
      return;
    }

    // Check if created_at column already exists
    const tableDescription = await queryInterface.describeTable('inventory');
    if (tableDescription.created_at) {
      console.log('created_at column already exists in inventory table');
      return;
    }

    // Add created_at column with default value of updated_at (or current timestamp)
    await queryInterface.addColumn('inventory', 'created_at', {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    });

    // Update existing rows to set created_at to updated_at value
    await queryInterface.sequelize.query(`
      UPDATE inventory 
      SET created_at = updated_at 
      WHERE created_at IS NULL
    `);

    console.log('✅ Successfully added created_at column to inventory table');
  },

  async down(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('inventory')) {
      return;
    }

    const tableDescription = await queryInterface.describeTable('inventory');
    if (tableDescription.created_at) {
      await queryInterface.removeColumn('inventory', 'created_at');
      console.log('✅ Removed created_at column from inventory table');
    }
  }
};
