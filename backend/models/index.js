const path = require('path');
const fs = require('fs');
const { sequelize } = require('../config/database');

// Helper to require a model file and handle either of these exports:
// - module.exports = (sequelize, DataTypes) => { return Model }
// - module.exports = Model (where Model already used sequelize.define)
function loadModel(filePath) {
  const mod = require(filePath);
  try {
    // If module is a function that expects (sequelize, DataTypes), call it
    if (typeof mod === 'function' && mod.length >= 2) {
      // pass DataTypes from sequelize
      return mod(sequelize, sequelize.constructor.DataTypes || require('sequelize').DataTypes);
    }
  } catch (err) {
    // fall through
  }
  // Otherwise assume the module already exports the initialized model
  return mod;
}

const modelsDir = __dirname;
const modelFiles = fs.readdirSync(modelsDir).filter(f => f.endsWith('.js') && f !== path.basename(__filename));
const models = {};

for (const file of modelFiles) {
  const fullPath = path.join(modelsDir, file);
  const loaded = loadModel(fullPath);
  // If the loaded module is a function/class (ES6 default export), try to get its name or modelName
  const name = loaded && (loaded.name || loaded.modelName || (loaded.options && loaded.options.name && loaded.options.name.singular));
  models[name || file.replace('.js', '')] = loaded;
}

// Call associate if present
Object.values(models).forEach(m => {
  if (m && typeof m.associate === 'function') {
    m.associate(models);
  }
});

module.exports = Object.assign({ sequelize }, models);
