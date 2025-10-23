'use strict';
const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

class Return extends Model {
  static associate(models) {
    // Use `this` to reference the model inside associate
    this.belongsTo(models.Sale, {
      foreignKey: 'saleId',
      onDelete: 'CASCADE'
    });
    this.belongsTo(models.User, {
      foreignKey: 'processedById',
      as: 'processor'
    });
    this.hasMany(models.ReturnItem, {
      foreignKey: 'returnId',
      as: 'items'
    });
  }
}

Return.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  saleId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'sales',
      key: 'id'
    }
  },
  processedById: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  returnDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  returnType: {
    type: DataTypes.ENUM('REFUND', 'EXCHANGE'),
    allowNull: false
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'),
    allowNull: false,
    defaultValue: 'PENDING'
  },
  totalRefundAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  refundMethod: {
    type: DataTypes.ENUM('CASH', 'BANK_TRANSFER', 'STORE_CREDIT'),
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'Return',
  tableName: 'returns',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Return;
