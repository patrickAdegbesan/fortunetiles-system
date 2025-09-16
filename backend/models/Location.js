const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Location = sequelize.define('Location', {
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
  address: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
}, {
  tableName: 'locations',
  timestamps: true,
});

Location.associate = function(models) {
  // One-to-many relationship with User
  Location.hasMany(models.User, {
    foreignKey: 'locationId',
    as: 'users'
  });

  // One-to-many relationship with Inventory
  Location.hasMany(models.Inventory, {
    foreignKey: 'locationId',
    as: 'inventory'
  });

  // One-to-many relationship with Sale
  Location.hasMany(models.Sale, {
    foreignKey: 'locationId',
    as: 'sales'
  });

  // One-to-many relationship with ReturnItem
  Location.hasMany(models.ReturnItem, {
    foreignKey: 'locationId',
    as: 'returnItems'
  });

  // One-to-many relationship with InventoryLog
  Location.hasMany(models.InventoryLog, {
    foreignKey: 'locationId',
    as: 'inventoryLogs'
  });
};

module.exports = Location;
