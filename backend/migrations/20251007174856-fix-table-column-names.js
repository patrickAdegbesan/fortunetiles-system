'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Only fix the categories table that was created with wrong column names
    const existingTables = await queryInterface.showAllTables();

    if (existingTables.includes('categories')) {
      // Drop and recreate categories table with correct column names
      await queryInterface.dropTable('categories');

      await queryInterface.createTable('categories', {
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
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
        },
      });
    }
  },

  async down (queryInterface, Sequelize) {
    // This migration only affects categories table
    await queryInterface.dropTable('categories');
  }
};
