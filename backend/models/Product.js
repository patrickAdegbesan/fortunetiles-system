const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

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

Product.associate = function(models) {
  // Many-to-one relationship with ProductType
  Product.belongsTo(models.ProductType, {
    foreignKey: 'productTypeId',
    as: 'productType'
  });

  // One-to-many relationship with Inventory
  Product.hasMany(models.Inventory, {
    foreignKey: 'productId',
    as: 'inventory'
  });

  // One-to-many relationship with SaleItem
  Product.hasMany(models.SaleItem, {
    foreignKey: 'productId',
    as: 'saleItems'
  });

  // One-to-many relationship with ReturnItem
  Product.hasMany(models.ReturnItem, {
    foreignKey: 'productId',
    as: 'returnItems'
  });

  // One-to-many relationship with InventoryLog
  Product.hasMany(models.InventoryLog, {
    foreignKey: 'productId',
    as: 'inventoryLogs'
  });
};

module.exports = Product;
