const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('sales', 'paymentMethod', {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'cash'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('sales', 'paymentMethod');
  }
};
