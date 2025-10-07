const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const GlobalAttribute = sequelize.define('GlobalAttribute', {
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
      len: [1, 100],
    },
  },
}, {
  tableName: 'global_attributes',
  timestamps: true,
  underscored: true,
});

module.exports = GlobalAttribute;
