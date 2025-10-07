'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const existingTables = await queryInterface.showAllTables();

    // Ensure products table exists with correct structure
    if (!existingTables.includes('products')) {
      await queryInterface.createTable('products', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        product_type_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'product_types',
            key: 'id'
          }
        },
        price: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
        },
        attributes: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: {},
        },
        categories: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: ['General'],
        },
        unit_of_measure: {
          type: Sequelize.STRING(20),
          allowNull: false,
          defaultValue: 'pcs',
        },
        supplier_code: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        image_url: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          defaultValue: true,
        },
        deleted_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
        },
      });
    } else {
      // Check if products table has the required columns and add them if missing
      const productTableDescription = await queryInterface.describeTable('products');
      
      // Add product_type_id if missing
      if (!productTableDescription.product_type_id) {
        await queryInterface.addColumn('products', 'product_type_id', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'product_types',
            key: 'id'
          }
        });
      }

      // Add other missing columns
      if (!productTableDescription.attributes) {
        await queryInterface.addColumn('products', 'attributes', {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: {},
        });
      }

      if (!productTableDescription.categories) {
        await queryInterface.addColumn('products', 'categories', {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: ['General'],
        });
      }

      if (!productTableDescription.unit_of_measure) {
        await queryInterface.addColumn('products', 'unit_of_measure', {
          type: Sequelize.STRING(20),
          allowNull: false,
          defaultValue: 'pcs',
        });
      }

      if (!productTableDescription.supplier_code) {
        await queryInterface.addColumn('products', 'supplier_code', {
          type: Sequelize.STRING,
          allowNull: true,
        });
      }

      if (!productTableDescription.image_url) {
        await queryInterface.addColumn('products', 'image_url', {
          type: Sequelize.TEXT,
          allowNull: true,
        });
      }

      if (!productTableDescription.description) {
        await queryInterface.addColumn('products', 'description', {
          type: Sequelize.TEXT,
          allowNull: true,
        });
      }

      if (!productTableDescription.is_active) {
        await queryInterface.addColumn('products', 'is_active', {
          type: Sequelize.BOOLEAN,
          defaultValue: true,
        });
      }

      if (!productTableDescription.deleted_at) {
        await queryInterface.addColumn('products', 'deleted_at', {
          type: Sequelize.DATE,
          allowNull: true,
        });
      }

      if (!productTableDescription.created_at) {
        await queryInterface.addColumn('products', 'created_at', {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        });
      }

      if (!productTableDescription.updated_at) {
        await queryInterface.addColumn('products', 'updated_at', {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        });
      }
    }

    // Ensure inventory table exists with correct structure
    if (!existingTables.includes('inventory')) {
      await queryInterface.createTable('inventory', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        product_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          field: 'productId',
          references: {
            model: 'products',
            key: 'id',
          },
        },
        location_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          field: 'locationId',
          references: {
            model: 'locations',
            key: 'id',
          },
        },
        quantity_sqm: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0,
          field: 'quantitySqm',
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
        },
      });
    }

    // Create sale_items table if it doesn't exist
    if (!existingTables.includes('sale_items')) {
      await queryInterface.createTable('sale_items', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        sale_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          field: 'saleId',
          references: {
            model: 'sales',
            key: 'id',
          },
        },
        product_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          field: 'productId',
          references: {
            model: 'products',
            key: 'id',
          },
        },
        location_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          field: 'locationId',
          references: {
            model: 'locations',
            key: 'id',
          },
        },
        quantity: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
        },
        unit_price: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          field: 'unitPrice',
        },
        total_price: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          field: 'totalPrice',
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
        },
      });
    }

    // Create return_items table if it doesn't exist (referenced in error logs)
    if (!existingTables.includes('return_items')) {
      await queryInterface.createTable('return_items', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        return_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          field: 'returnId',
          references: {
            model: 'returns',
            key: 'id',
          },
        },
        sale_item_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          field: 'saleItemId',
          references: {
            model: 'sale_items',
            key: 'id',
          },
        },
        product_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          field: 'productId',
          references: {
            model: 'products',
            key: 'id',
          },
        },
        location_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          field: 'locationId',
          references: {
            model: 'locations',
            key: 'id',
          },
        },
        quantity: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
        },
        return_reason: {
          type: Sequelize.STRING,
          allowNull: true,
          field: 'returnReason',
        },
        condition: {
          type: Sequelize.ENUM('damaged', 'defective', 'wrong_item', 'customer_change_mind', 'other'),
          allowNull: false,
          defaultValue: 'other',
        },
        refund_amount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          field: 'refundAmount',
        },
        exchange_product_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          field: 'exchangeProductId',
          references: {
            model: 'products',
            key: 'id',
          },
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
        },
      });
    }
  },

  async down (queryInterface, Sequelize) {
    // Remove added columns and tables if needed
    const existingTables = await queryInterface.showAllTables();

    if (existingTables.includes('return_items')) {
      await queryInterface.dropTable('return_items');
    }

    if (existingTables.includes('sale_items')) {
      await queryInterface.dropTable('sale_items');
    }

    if (existingTables.includes('inventory')) {
      await queryInterface.dropTable('inventory');
    }

    if (existingTables.includes('products')) {
      const productTableDescription = await queryInterface.describeTable('products');
      
      // Remove columns that were added
      if (productTableDescription.product_type_id) {
        await queryInterface.removeColumn('products', 'product_type_id');
      }
    }
  }
};