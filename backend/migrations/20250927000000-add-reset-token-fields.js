const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('users');
    
    if (!tableDescription.resetToken) {
      await queryInterface.addColumn('users', 'resetToken', {
        type: DataTypes.STRING,
        allowNull: true
      });
    }

    if (!tableDescription.resetTokenExpiry) {
      await queryInterface.addColumn('users', 'resetTokenExpiry', {
        type: DataTypes.DATE,
        allowNull: true
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('users');
    
    if (tableDescription.resetToken) {
      await queryInterface.removeColumn('users', 'resetToken');
    }
    
    if (tableDescription.resetTokenExpiry) {
      await queryInterface.removeColumn('users', 'resetTokenExpiry');
    }
  }
};