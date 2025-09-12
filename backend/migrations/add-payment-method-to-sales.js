const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if the sales table exists
    const [tableExistsRows] = await queryInterface.sequelize.query(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables 
         WHERE table_name = 'sales'
       ) AS exists;`
    );
    const tableExists = Array.isArray(tableExistsRows) ? (tableExistsRows[0]?.exists || tableExistsRows[0]?.exists === true) : false;
    if (!tableExists) return; // Nothing to do on fresh DB without table

    // Check if column already exists
    const [rows] = await queryInterface.sequelize.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'sales' AND column_name = 'paymentMethod';
    `);
    const exists = Array.isArray(rows) && rows.length > 0;
    if (exists) return;

    await queryInterface.addColumn('sales', 'paymentMethod', {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'cash'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Only remove if exists
    const [rows] = await queryInterface.sequelize.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'sales' AND column_name = 'paymentMethod';
    `);
    const exists = Array.isArray(rows) && rows.length > 0;
    if (!exists) return;
    await queryInterface.removeColumn('sales', 'paymentMethod');
  }
};
