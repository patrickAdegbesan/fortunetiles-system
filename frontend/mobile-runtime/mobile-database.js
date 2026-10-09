// Replaces backend/config/database.js inside the app: same exports, but Sequelize talks to the
// terminal's SQLite through the bridge instead of the sqlite3 module.
const { Sequelize, DataTypes } = require('sequelize');
const { createSqlite3Module, driverRef } = require('./sqlite3-bridge');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  dialectModule: createSqlite3Module(),
  storage: 'fortunetiles.db',          // a file-style name makes Sequelize open one connection per transaction
  dialectOptions: { mode: 2 },         // read/write without OPEN_CREATE (Sequelize then never touches fs)
  logging: false,
});

const testConnection = async () => { await sequelize.authenticate(); };

module.exports = { sequelize, DataTypes, testConnection, dataDir: '', driverRef };
