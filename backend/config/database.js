const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
const fs = require('fs');

// All data lives in a single SQLite file inside DATA_DIR so the whole app can
// be copied between computers (e.g. on a flash drive).
const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });
const storage = process.env.SQLITE_PATH || path.join(dataDir, 'fortunetiles.sqlite');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage,
  logging: false,
});

const testConnection = async () => {
  await sequelize.authenticate();
  await sequelize.query('PRAGMA foreign_keys = ON');
  console.log(`Database ready: ${storage}`);
};

module.exports = { sequelize, DataTypes, testConnection, dataDir };
