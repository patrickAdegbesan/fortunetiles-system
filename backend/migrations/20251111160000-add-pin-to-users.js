'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.addColumn('users', 'pin', {
        type: Sequelize.STRING(4),
        allowNull: true,
        comment: 'Admin PIN for granting markup privileges to staff'
      });
      console.log('Added pin column to users table');
    } catch (error) {
      console.error('Error adding pin column:', error.message);
      throw error;
    }
  },

  down: async (queryInterface) => {
    try {
      await queryInterface.removeColumn('users', 'pin');
      console.log('Removed pin column from users table');
    } catch (error) {
      console.error('Error removing pin column:', error.message);
      throw error;
    }
  }
};