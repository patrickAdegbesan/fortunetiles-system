const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserActivity = sequelize.define('UserActivity', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  resource: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  resourceId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  details: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'user_activities',
  timestamps: true,
  indexes: [
    {
      fields: ['userId']
    },
    {
      fields: ['action']
    },
    {
      fields: ['createdAt']
    }
  ]
});

UserActivity.associate = function(models) {
  // Many-to-one relationship with User
  UserActivity.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user'
  });
};

module.exports = UserActivity;
