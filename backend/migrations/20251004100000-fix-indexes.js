'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // We'll use raw SQL to add the indexes since we're having issues with column names
    try {
      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS sales_date_location_idx ON sales ("createdAt", "locationId");
      `);
      
      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS inventory_location_quantity_idx ON inventory ("locationId", "quantitySqm");
      `);
      
      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS products_search_idx ON products (name, "isActive", category);
      `);
      
      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS inventory_logs_analytics_idx ON inventory_logs ("locationId", "createdAt", "changeType");
      `);
      
      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS users_email_role_idx ON users (email, role);
      `);
    } catch (error) {
      console.error('Error adding indexes:', error);
      // Don't throw error, allow deployment to continue
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.sequelize.query(`DROP INDEX IF EXISTS sales_date_location_idx;`);
      await queryInterface.sequelize.query(`DROP INDEX IF EXISTS inventory_location_quantity_idx;`);
      await queryInterface.sequelize.query(`DROP INDEX IF EXISTS products_search_idx;`);
      await queryInterface.sequelize.query(`DROP INDEX IF EXISTS inventory_logs_analytics_idx;`);
      await queryInterface.sequelize.query(`DROP INDEX IF EXISTS users_email_role_idx;`);
    } catch (error) {
      console.error('Error removing indexes:', error);
    }
  }
};