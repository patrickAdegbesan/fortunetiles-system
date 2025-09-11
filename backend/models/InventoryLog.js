const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const InventoryLog = sequelize.define('InventoryLog', {
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
}, {
  tableName: 'inventory_logs',
  timestamps: true,
  updatedAt: false,
});

module.exports = InventoryLog;
