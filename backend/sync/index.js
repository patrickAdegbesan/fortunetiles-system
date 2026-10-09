// One sync engine per process, bound to the local database.
const { sequelize } = require('../config/database');
const { createSyncEngine } = require('./engine');

module.exports = createSyncEngine({ sequelize });
