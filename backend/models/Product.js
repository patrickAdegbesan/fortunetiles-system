const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const ProductType = require('./ProductType');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  productTypeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'product_types',
      key: 'id'
    }
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0,
    },
  },
  customAttributes: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
  },
  supplierCode: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  category: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'General',
  },
  imageUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'products',
  timestamps: true,
  paranoid: true,
  underscored: true,
});

module.exports = Product;
