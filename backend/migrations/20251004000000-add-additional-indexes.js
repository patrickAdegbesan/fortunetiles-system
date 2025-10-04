'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add additional performance indexes
    await Promise.all([
      // Composite index for common sales queries
      queryInterface.addIndex('sales', {
        name: 'sales_date_location_idx',
        fields: ['created_at', 'location_id'],
        concurrently: true,
      }),
      
      // Composite index for frequent inventory lookups
      queryInterface.addIndex('inventory', {
        name: 'inventory_location_quantity_idx',
        fields: ['locationId', 'quantitySqm'],
        concurrently: true,
      }),
      
      // Improved index for product search and sorting
      queryInterface.addIndex('products', {
        name: 'products_search_idx',
        fields: ['name', 'is_active', 'category'],
        concurrently: true,
      }),
      
      // Index for inventory logs analytics
      queryInterface.addIndex('inventory_logs', {
        name: 'inventory_logs_analytics_idx',
        fields: ['location_id', 'created_at', 'change_type'],
        concurrently: true,
      }),
      
      // Optimize user lookup
      queryInterface.addIndex('users', {
        name: 'users_email_role_idx',
        fields: ['email', 'role'],
        concurrently: true,
      })
    ]);
  },

  async down(queryInterface, Sequelize) {
    await Promise.all([
      queryInterface.removeIndex('sales', 'sales_date_location_idx'),
      queryInterface.removeIndex('inventory', 'inventory_location_quantity_idx'),
      queryInterface.removeIndex('products', 'products_search_idx'),
      queryInterface.removeIndex('inventory_logs', 'inventory_logs_analytics_idx'),
      queryInterface.removeIndex('users', 'users_email_role_idx')
    ]);
  }
};