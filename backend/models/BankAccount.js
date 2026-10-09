const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// The shop's bank accounts. At checkout, when the customer pays by transfer, the cashier picks the account(s) to pay
// into and those details are printed on the receipt.
const BankAccount = sequelize.define('BankAccount', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  bankName: { type: DataTypes.STRING(100), allowNull: false, field: 'bank_name', validate: { notEmpty: true } },
  accountNumber: { type: DataTypes.STRING(30), allowNull: false, field: 'account_number', validate: { notEmpty: true } },
  accountName: { type: DataTypes.STRING(150), allowNull: true, field: 'account_name' },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
  sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'sort_order' },
}, {
  tableName: 'bank_accounts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = BankAccount;
