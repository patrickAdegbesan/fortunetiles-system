'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add additional performance indexes
    await Promise.all([
      // Composite index for common sales queries
      queryInterface.addIndex('Sales', {
        name: 'sales_date_location_idx',
        fields: ['createdAt', 'locationId'],
        concurrently: true,
      }),
      
      // Composite index for frequent inventory lookups
      queryInterface.addIndex('Inventory', {
        name: 'inventory_location_quantity_idx',
        fields: ['locationId', 'quantitySqm'],
        concurrently: true,
      }),
      
      // Improved index for product search and sorting
      queryInterface.addIndex('Products', {
        name: 'products_search_idx',
        fields: ['name', 'isActive', 'categoryId'],
        concurrently: true,
      }),
      
      // Index for inventory logs analytics
      queryInterface.addIndex('InventoryLogs', {
        name: 'inventory_logs_analytics_idx',
        fields: ['locationId', 'createdAt', 'changeType'],
        concurrently: true,
      }),
      
      // Optimize user lookup
      queryInterface.addIndex('Users', {
        name: 'users_email_role_idx',
        fields: ['email', 'role'],
        concurrently: true,
      })
    ]);
  },

  async down(queryInterface, Sequelize) {
    await Promise.all([
      queryInterface.removeIndex('Sales', 'sales_date_location_idx'),
      queryInterface.removeIndex('Inventory', 'inventory_location_quantity_idx'),
      queryInterface.removeIndex('Products', 'products_search_idx'),
      queryInterface.removeIndex('InventoryLogs', 'inventory_logs_analytics_idx'),
      queryInterface.removeIndex('Users', 'users_email_role_idx')
    ]);
  }
};