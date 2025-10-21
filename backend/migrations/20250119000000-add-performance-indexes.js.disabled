const { QueryInterface, Sequelize } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const addIndexSafely = async (table, columns, options) => {
      try {
        await queryInterface.addIndex(table, columns, options);
        console.log(`✅ Added index ${options.name}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⚠️  Index ${options.name} already exists, skipping`);
        } else {
          console.error(`❌ Error adding index ${options.name}:`, error.message);
          throw error;
        }
      }
    };

    try {
      console.log('🚀 Adding performance indexes...');

      // Products table indexes (snake_case columns)
      await addIndexSafely('products', ['is_active'], {
        name: 'products_is_active_idx'
      });

      await addIndexSafely('products', ['category'], {
        name: 'products_category_idx'
      });

      await addIndexSafely('products', ['product_type_id'], {
        name: 'products_product_type_id_idx'
      });

      await addIndexSafely('products', ['name'], {
        name: 'products_name_idx'
      });

      // Sales table indexes (camelCase columns)
      await addIndexSafely('sales', ['locationId'], {
        name: 'sales_location_id_idx'
      });

      await addIndexSafely('sales', ['userId'], {
        name: 'sales_user_id_idx'
      });

      await addIndexSafely('sales', ['createdAt'], {
        name: 'sales_created_at_idx'
      });

      // SaleItems table indexes 
      await addIndexSafely('sale_items', ['saleId'], {
        name: 'sale_items_sale_id_idx'
      });

      await addIndexSafely('sale_items', ['productId'], {
        name: 'sale_items_product_id_idx'
      });

      // Inventory table indexes
      await addIndexSafely('inventory', ['productId', 'locationId'], {
        name: 'inventory_product_location_idx'
      });

      await addIndexSafely('inventory', ['locationId'], {
        name: 'inventory_location_id_idx'
      });

      // InventoryLog table indexes
      await addIndexSafely('inventory_logs', ['productId'], {
        name: 'inventory_logs_product_id_idx'
      });

      await addIndexSafely('inventory_logs', ['locationId'], {
        name: 'inventory_logs_location_id_idx'
      });

      await addIndexSafely('inventory_logs', ['createdAt'], {
        name: 'inventory_logs_created_at_idx'
      });

      await addIndexSafely('inventory_logs', ['changeType'], {
        name: 'inventory_logs_change_type_idx'
      });

      // Composite indexes for common query patterns
      await addIndexSafely('products', ['is_active', 'category'], {
        name: 'products_active_category_idx'
      });

      await addIndexSafely('sales', ['locationId', 'createdAt'], {
        name: 'sales_location_created_idx'
      });

      console.log('✅ Performance indexes migration completed successfully');
    } catch (error) {
      console.error('❌ Error in performance indexes migration:', error.message);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes in reverse order
    const tableIndexes = [
      { table: 'sales', index: 'sales_location_created_idx' },
      { table: 'products', index: 'products_active_category_idx' },
      { table: 'inventory_logs', index: 'inventory_logs_change_type_idx' },
      { table: 'inventory_logs', index: 'inventory_logs_created_at_idx' },
      { table: 'inventory_logs', index: 'inventory_logs_location_id_idx' },
      { table: 'inventory_logs', index: 'inventory_logs_product_id_idx' },
      { table: 'inventories', index: 'inventory_location_id_idx' },
      { table: 'inventories', index: 'inventory_product_location_idx' },
      { table: 'sale_items', index: 'sale_items_product_id_idx' },
      { table: 'sale_items', index: 'sale_items_sale_id_idx' },
      { table: 'sales', index: 'sales_created_at_idx' },
      { table: 'sales', index: 'sales_user_id_idx' },
      { table: 'sales', index: 'sales_location_id_idx' },
      { table: 'products', index: 'products_name_idx' },
      { table: 'products', index: 'products_product_type_id_idx' },
      { table: 'products', index: 'products_category_idx' },
      { table: 'products', index: 'products_is_active_idx' }
    ];

    for (const { table, index } of tableIndexes) {
      try {
        await queryInterface.removeIndex(table, index);
      } catch (error) {
        // Index might not exist, continue
        console.log(`⚠️  Index ${index} on table ${table} not found, skipping`);
      }
    }
  }
};