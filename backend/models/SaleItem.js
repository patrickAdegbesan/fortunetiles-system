const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SaleItem = sequelize.define('SaleItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  saleId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'sales',
      key: 'id',
    },
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'products',
      key: 'id',
    },
  },
  quantity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0,
    },
  },
  unitPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0,
    },
    // Physical column in DB is camelCase: unitPrice
    field: 'unitPrice'
  },
  lineTotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0,
    },
    // Physical column in DB is camelCase: totalPrice
    field: 'totalPrice'
  },
}, {
  tableName: 'sale_items',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

SaleItem.associate = function(models) {
  // Many-to-one relationship with Sale
  SaleItem.belongsTo(models.Sale, {
    foreignKey: 'saleId',
    as: 'sale'
  });

  // Many-to-one relationship with Product
  SaleItem.belongsTo(models.Product, {
    foreignKey: 'productId',
    as: 'product'
  });

  // One-to-many relationship with ReturnItem
  SaleItem.hasMany(models.ReturnItem, {
    foreignKey: 'saleItemId',
    as: 'returnItems'
  });
};

module.exports = SaleItem;
