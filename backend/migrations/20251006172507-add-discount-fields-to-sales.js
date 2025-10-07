'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Add discount fields to sales table
    await queryInterface.addColumn('sales', 'discountType', {
      type: Sequelize.ENUM('amount', 'percentage'),
      allowNull: true,
      defaultValue: null,
    });

    await queryInterface.addColumn('sales', 'discountValue', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
    });

    await queryInterface.addColumn('sales', 'subtotalAmount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    });
  },

  async down (queryInterface, Sequelize) {
    // Remove discount fields from sales table
    await queryInterface.removeColumn('sales', 'subtotalAmount');
    await queryInterface.removeColumn('sales', 'discountValue');
    await queryInterface.removeColumn('sales', 'discountType');
  }
};
