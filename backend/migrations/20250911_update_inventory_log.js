const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if the enum type exists before attempting to alter
    const [typeExistsRows] = await queryInterface.sequelize.query(
      `SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_inventory_logs_changetype') AS exists;`
    );
    const typeExists = Array.isArray(typeExistsRows) ? (typeExistsRows[0]?.exists || typeExistsRows[0]?.exists === true) : false;

    if (typeExists) {
      // Add 'initial' to changeType enum
      await queryInterface.sequelize
        .query(`ALTER TYPE "enum_inventory_logs_changetype" ADD VALUE 'initial';`)
        .catch(err => {
          // Ignore error if value already exists
          if (!err.message.includes('already exists')) {
            throw err;
          }
        });
    } else {
      // Fresh database where enum (and likely table) doesn't yet exist; safe to skip
      // The enum will be created when the table is initially created.
    }

    // Make userId nullable only if table exists
    const [tableExistsRows] = await queryInterface.sequelize.query(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables 
         WHERE table_name = 'inventory_logs'
       ) AS exists;`
    );
    const tableExists = Array.isArray(tableExistsRows) ? (tableExistsRows[0]?.exists || tableExistsRows[0]?.exists === true) : false;

    if (tableExists) {
      await queryInterface.changeColumn('inventory_logs', 'userId', {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Make userId non-nullable again if table exists
    const [tableExistsRows] = await queryInterface.sequelize.query(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables 
         WHERE table_name = 'inventory_logs'
       ) AS exists;`
    );
    const tableExists = Array.isArray(tableExistsRows) ? (tableExistsRows[0]?.exists || tableExistsRows[0]?.exists === true) : false;

    if (tableExists) {
      await queryInterface.changeColumn('inventory_logs', 'userId', {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      });
    }

    // Note: Cannot remove enum value in postgres, would need to recreate the type
  }
};
