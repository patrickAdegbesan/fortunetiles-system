// Replaces backend/models/index.js inside the app: the original discovers model files with fs.readdirSync,
// which a bundler cannot do, so the model files are listed explicitly. Associations are identical.
const { sequelize } = require('./mobile-database');

const models = {
  BankAccount: require('../../backend/models/BankAccount'),
  Category: require('../../backend/models/Category'),
  GlobalAttribute: require('../../backend/models/GlobalAttribute'),
  Inventory: require('../../backend/models/Inventory'),
  InventoryLog: require('../../backend/models/InventoryLog'),
  Location: require('../../backend/models/Location'),
  Product: require('../../backend/models/Product'),
  ProductType: require('../../backend/models/ProductType'),
  ReturnItem: require('../../backend/models/ReturnItem'),
  Return: require('../../backend/models/Return'),
  SaleItem: require('../../backend/models/SaleItem'),
  Sale: require('../../backend/models/Sale'),
  UserActivity: require('../../backend/models/UserActivity'),
  User: require('../../backend/models/User'),
};

Object.values(models).forEach((m) => {
  if (m && typeof m.associate === 'function') m.associate(models);
});

module.exports = Object.assign({ sequelize }, models);
