'use strict';
const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

class ReturnItem extends Model {
  static associate(models) {
    this.belongsTo(models.Return, {
      foreignKey: 'returnId',
      onDelete: 'CASCADE'
    });
    this.belongsTo(models.Product, {
      foreignKey: 'productId'
    });
    this.belongsTo(models.SaleItem, {
      foreignKey: 'saleItemId'
    });
    this.belongsTo(models.Location, {
      foreignKey: 'locationId'
    });
  }
}

ReturnItem.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  returnId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'returns',
      key: 'id'
    }
  },
  saleItemId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'sale_items',
      key: 'id'
    }
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'products',
      key: 'id'
    }
  },
  locationId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'locations',
      key: 'id'
    }
  },
  quantity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  returnReason: {
    type: DataTypes.STRING,
    allowNull: true
  },
  condition: {
    type: DataTypes.ENUM('PERFECT', 'GOOD', 'DAMAGED'),
    allowNull: false,
    defaultValue: 'PERFECT'
  },
  refundAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  exchangeProductId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'products',
      key: 'id'
    }
  }
}, {
  sequelize,
  modelName: 'ReturnItem',
  tableName: 'return_items',
  timestamps: true
});

module.exports = ReturnItem;
