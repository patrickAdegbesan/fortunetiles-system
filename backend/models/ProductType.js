const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ProductType = sequelize.define('ProductType', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
    },
  },
  unitOfMeasure: {
    type: DataTypes.STRING(20),
    allowNull: false,
    field: 'unit_of_measure',
    validate: {
      notEmpty: true,
    },
  },
  attributes: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  tableName: 'product_types',
  timestamps: true,
  underscored: true,
});

ProductType.associate = function(models) {
  // One-to-many relationship with Product
  ProductType.hasMany(models.Product, {
    foreignKey: 'productTypeId',
    as: 'products'
  });
};

module.exports = ProductType;
