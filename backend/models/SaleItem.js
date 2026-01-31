const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SaleItem = sequelize.define('SaleItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
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
  baseUnitPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0,
    },
    comment: 'Original product price at time of sale',
    field: 'base_unit_price'
  },
  markupPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0,
    },
    comment: 'Additional amount added by contractor/middleman',
    field: 'markup_price'
  },
  markupBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'User ID of contractor who added the markup',
    field: 'markup_by'
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

  // Many-to-one relationship with User (contractor who added markup)
  SaleItem.belongsTo(models.User, {
    foreignKey: 'markupBy',
    as: 'contractor'
  });
};

module.exports = SaleItem;
