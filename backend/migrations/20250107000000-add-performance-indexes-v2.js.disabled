const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add performance indexes for frequently queried columns
    
    // Index on inventory.locationId for location filtering
    await queryInterface.addIndex('inventory', ['locationId'], {
      name: 'idx_inventory_location_id',
      using: 'BTREE'
    });
    
    // Index on inventory.productId for product lookups
    await queryInterface.addIndex('inventory', ['productId'], {
      name: 'idx_inventory_product_id',
      using: 'BTREE'
    });
    
    // Composite index for inventory queries with location + product
    await queryInterface.addIndex('inventory', ['locationId', 'productId'], {
      name: 'idx_inventory_location_product',
      using: 'BTREE'
    });
    
    // Index on inventory.updatedAt for ordering
    await queryInterface.addIndex('inventory', ['updatedAt'], {
      name: 'idx_inventory_updated_at',
      using: 'BTREE'
    });
    
    // Index on inventory_logs.productId for log queries
    await queryInterface.addIndex('inventory_logs', ['productId'], {
      name: 'idx_inventory_logs_product_id',
      using: 'BTREE'
    });
    
    // Index on inventory_logs.locationId for log queries
    await queryInterface.addIndex('inventory_logs', ['locationId'], {
      name: 'idx_inventory_logs_location_id',
      using: 'BTREE'
    });
    
    // Index on inventory_logs.createdAt for date range queries
    await queryInterface.addIndex('inventory_logs', ['createdAt'], {
      name: 'idx_inventory_logs_created_at',
      using: 'BTREE'
    });
    
    // Index on products.categories for category filtering (JSONB)
    await queryInterface.addIndex('products', ['categories'], {
      name: 'idx_products_categories',
      using: 'GIN'  // GIN index for JSONB operations
    });
    
    // Index on products.product_type_id for joins
    await queryInterface.addIndex('products', ['product_type_id'], {
      name: 'idx_products_product_type_id',
      using: 'BTREE'
    });
    
    // Index on users.email for login queries
    await queryInterface.addIndex('users', ['email'], {
      name: 'idx_users_email',
      using: 'BTREE'
    });
    
    console.log('Performance indexes created successfully');
  },

  down: async (queryInterface, Sequelize) => {
    // Remove all the indexes we created
    const indexesToDrop = [
      { table: 'inventory', indexes: ['idx_inventory_location_id', 'idx_inventory_product_id', 'idx_inventory_location_product', 'idx_inventory_updated_at'] },
      { table: 'inventory_logs', indexes: ['idx_inventory_logs_product_id', 'idx_inventory_logs_location_id', 'idx_inventory_logs_created_at'] },
      { table: 'products', indexes: ['idx_products_categories', 'idx_products_product_type_id'] },
      { table: 'users', indexes: ['idx_users_email'] }
    ];
    
    for (const { table, indexes } of indexesToDrop) {
      for (const indexName of indexes) {
        try {
          await queryInterface.removeIndex(table, indexName);
        } catch (error) {
          // Index might not exist, continue
          console.log(`Could not remove index ${indexName} from ${table}:`, error.message);
        }
      }
    }
    
    console.log('Performance indexes removed');
  }
};