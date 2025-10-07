const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Sale = sequelize.define('Sale', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  customerName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  customerPhone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0,
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
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  paymentMethod: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'cash',
    validate: {
      isIn: [['cash', 'bank_transfer', 'pos', 'card']]
    }
  },
  discountType: {
    type: DataTypes.ENUM('amount', 'percentage'),
    allowNull: true,
    defaultValue: null,
  },
  discountValue: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0,
    validate: {
      min: 0,
    },
  },
  subtotalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0,
    },
  },
}, {
  tableName: 'sales',
  timestamps: true,
  updatedAt: false,
});

Sale.associate = function(models) {
  // Many-to-one relationship with User (cashier)
  Sale.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'cashier'
  });

  // Many-to-one relationship with Location
  Sale.belongsTo(models.Location, {
    foreignKey: 'locationId',
    as: 'location'
  });

  // One-to-many relationship with SaleItem
  Sale.hasMany(models.SaleItem, {
    foreignKey: 'saleId',
    as: 'items'
  });

  // One-to-many relationship with Return
  Sale.hasMany(models.Return, {
    foreignKey: 'saleId',
    as: 'returns'
  });
};

module.exports = Sale;
