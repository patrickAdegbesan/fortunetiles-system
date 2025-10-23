const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('inventory_logs', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      productId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'products',
          key: 'id',
        },
      },
      locationId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'locations',
          key: 'id',
        },
      },
      changeType: {
        type: DataTypes.ENUM('sale', 'broken', 'received', 'adjusted', 'initial'),
        allowNull: false,
      },
      changeAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Can be negative for deductions',
      },
      previousQuantity: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      newQuantity: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: true, // Allow null for system-generated logs
        references: {
          model: 'users',
          key: 'id',
        },
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    }, { transaction: undefined });

    // Add indexes for performance
    await queryInterface.addIndex('inventory_logs', ['productId']);
    await queryInterface.addIndex('inventory_logs', ['locationId']);
    await queryInterface.addIndex('inventory_logs', ['userId']);
    await queryInterface.addIndex('inventory_logs', ['created_at']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('inventory_logs', { cascade: true });
  }
};