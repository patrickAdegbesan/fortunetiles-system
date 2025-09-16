const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Inventory = sequelize.define('Inventory', {
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
  quantitySqm: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0,
    },
  },
}, {
  tableName: 'inventory',
  timestamps: true,
  updatedAt: true,
  createdAt: false,
  indexes: [
    {
      unique: true,
      fields: ['productId', 'locationId'],
    },
  ],
});

Inventory.associate = function(models) {
  // Many-to-one relationship with Product
  Inventory.belongsTo(models.Product, {
    foreignKey: 'productId',
    as: 'product'
  });

  // Many-to-one relationship with Location
  Inventory.belongsTo(models.Location, {
    foreignKey: 'locationId',
    as: 'location'
  });
};

module.exports = Inventory;
