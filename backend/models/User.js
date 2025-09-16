const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
      notEmpty: true,
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [6, 255],
    },
  },
  role: {
    type: DataTypes.ENUM('owner', 'manager', 'staff'),
    allowNull: false,
    defaultValue: 'staff',
  },
  locationId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'locations',
      key: 'id',
    },
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'users',
  timestamps: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    },
  },
});

// Instance method to check password
User.prototype.checkPassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

User.associate = function(models) {
  // Many-to-one relationship with Location
  User.belongsTo(models.Location, {
    foreignKey: 'locationId',
    as: 'location'
  });

  // One-to-many relationship with Sale (user as cashier)
  User.hasMany(models.Sale, {
    foreignKey: 'userId',
    as: 'sales'
  });

  // One-to-many relationship with Return (user as processor)
  User.hasMany(models.Return, {
    foreignKey: 'processedBy',
    as: 'processedReturns'
  });

  // One-to-many relationship with UserActivity
  User.hasMany(models.UserActivity, {
    foreignKey: 'userId',
    as: 'activities'
  });

  // One-to-many relationship with InventoryLog
  User.hasMany(models.InventoryLog, {
    foreignKey: 'userId',
    as: 'inventoryLogs'
  });
};

module.exports = User;
