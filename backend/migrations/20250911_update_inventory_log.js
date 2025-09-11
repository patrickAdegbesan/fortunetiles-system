const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add 'initial' to changeType enum
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_inventory_logs_changetype" ADD VALUE 'initial';
    `).catch(err => {
      // Ignore error if value already exists
      if (!err.message.includes('already exists')) {
        throw err;
      }
    });

    // Make userId nullable
    await queryInterface.changeColumn('inventory_logs', 'userId', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Make userId non-nullable again
    await queryInterface.changeColumn('inventory_logs', 'userId', {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    });

    // Note: Cannot remove enum value in postgres, would need to recreate the type
  }
};
