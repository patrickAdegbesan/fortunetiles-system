const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'resetToken', {
      type: DataTypes.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('users', 'resetTokenExpiry', {
      type: DataTypes.DATE,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('users', 'resetToken');
    await queryInterface.removeColumn('users', 'resetTokenExpiry');
  }
};