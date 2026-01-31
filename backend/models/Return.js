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
  uuid: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
    unique: true
  },
  version: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  saleId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'saleid',  // Map to lowercase column in database
    references: {
      model: 'sales',
      key: 'id'
    }
  },
  processedById: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'processedbyid',  // Map to lowercase column in database
    references: {
      model: 'users',
      key: 'id'
    }
  },
  returnDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'returndate',  // Map to lowercase column
    defaultValue: DataTypes.NOW
  },
  returnType: {
    type: DataTypes.TEXT,  // Changed from ENUM to TEXT to match database
    allowNull: false,
    field: 'returntype'  // Map to lowercase column
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.TEXT,  // Changed from ENUM to TEXT to match database
    allowNull: false,
    defaultValue: 'PENDING'
  },
  totalRefundAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'totalrefundamount'  // Map to lowercase column
  },
  refundMethod: {
    type: DataTypes.TEXT,  // Changed from ENUM to TEXT to match database
    allowNull: true,
    field: 'refundmethod'  // Map to lowercase column
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
