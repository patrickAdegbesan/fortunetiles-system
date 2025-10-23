'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Add discount fields to sales table (idempotent)
    const salesDesc = await queryInterface.describeTable('sales');

    if (!salesDesc.discountType) {
      await queryInterface.addColumn('sales', 'discountType', {
        type: Sequelize.ENUM('amount', 'percentage'),
        allowNull: true,
        defaultValue: null,
      });
    }

    if (!salesDesc.discountValue) {
      await queryInterface.addColumn('sales', 'discountValue', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
      });
    }

    if (!salesDesc.subtotalAmount) {
      await queryInterface.addColumn('sales', 'subtotalAmount', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      });
    }
  },

  async down (queryInterface, Sequelize) {
    // Remove discount fields from sales table
    await queryInterface.removeColumn('sales', 'subtotalAmount');
    await queryInterface.removeColumn('sales', 'discountValue');
    await queryInterface.removeColumn('sales', 'discountType');
  }
};
