'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if locations table exists
    const existingTables = await queryInterface.showAllTables();
    if (!existingTables.includes('locations')) {
      // Create locations table if it doesn't exist
      await queryInterface.createTable('locations', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        address: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      });
    } else {
      // Check if timestamp columns exist and add them if missing
      const tableDescription = await queryInterface.describeTable('locations');

      if (!tableDescription.createdAt) {
        await queryInterface.addColumn('locations', 'createdAt', {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        });
      }

      if (!tableDescription.updatedAt) {
        await queryInterface.addColumn('locations', 'updatedAt', {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        });
      }
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove timestamp columns if they exist
    const tableDescription = await queryInterface.describeTable('locations');

    if (tableDescription.updatedAt) {
      await queryInterface.removeColumn('locations', 'updatedAt');
    }

    if (tableDescription.createdAt) {
      await queryInterface.removeColumn('locations', 'createdAt');
    }
  }
};