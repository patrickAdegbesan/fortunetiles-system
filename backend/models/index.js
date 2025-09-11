const { sequelize } = require('../config/database');

// Import all models
const User = require('./User');
const Location = require('./Location');
const Product = require('./Product');
const ProductType = require('./ProductType');
const Inventory = require('./Inventory');
const InventoryLog = require('./InventoryLog');
const Sale = require('./Sale');
const SaleItem = require('./SaleItem');
const UserActivity = require('./UserActivity');

// Define associations
// Location associations
Location.hasMany(User, { foreignKey: 'locationId', as: 'users' });
Location.hasMany(Inventory, { foreignKey: 'locationId', as: 'inventory' });
Location.hasMany(Sale, { foreignKey: 'locationId', as: 'sales' });

// User associations
User.belongsTo(Location, { foreignKey: 'locationId', as: 'location' });
User.hasMany(InventoryLog, { foreignKey: 'userId', as: 'inventoryLogs' });
User.hasMany(Sale, { foreignKey: 'userId', as: 'sales' });
User.hasMany(UserActivity, { foreignKey: 'userId', as: 'activities' });

// ProductType associations
ProductType.hasMany(Product, { foreignKey: 'productTypeId', as: 'products' });

// Product associations
Product.belongsTo(ProductType, { foreignKey: 'productTypeId', as: 'productType' });
Product.hasMany(Inventory, { foreignKey: 'productId', as: 'inventory' });
Product.hasMany(InventoryLog, { foreignKey: 'productId', as: 'inventoryLogs' });
Product.hasMany(SaleItem, { foreignKey: 'productId', as: 'saleItems' });

// Inventory associations
Inventory.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
Inventory.belongsTo(Location, { foreignKey: 'locationId', as: 'location' });

// InventoryLog associations
InventoryLog.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
InventoryLog.belongsTo(Location, { foreignKey: 'locationId', as: 'location' });
InventoryLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Sale associations
Sale.belongsTo(Location, { foreignKey: 'locationId', as: 'location' });
Sale.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Sale.hasMany(SaleItem, { foreignKey: 'saleId', as: 'items' });

// SaleItem associations
SaleItem.belongsTo(Sale, { foreignKey: 'saleId', as: 'sale' });
SaleItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

// UserActivity associations
UserActivity.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = {
  sequelize,
  User,
  Location,
  Product,
  ProductType,
  Inventory,
  InventoryLog,
  Sale,
  SaleItem,
  UserActivity
};
