'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Check which tables exist and only create missing ones
    const existingTables = await queryInterface.showAllTables();

    // Create users table if it doesn't exist
    if (!existingTables.includes('users')) {
      await queryInterface.createTable('users', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        first_name: {
          type: Sequelize.STRING,
          allowNull: false,
          field: 'firstName',
        },
        last_name: {
          type: Sequelize.STRING,
          allowNull: false,
          field: 'lastName',
        },
        email: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true,
        },
        password: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        role: {
          type: Sequelize.ENUM('owner', 'manager', 'staff'),
          allowNull: false,
          defaultValue: 'staff',
        },
        location_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          field: 'locationId',
          references: {
            model: 'locations',
            key: 'id',
          },
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          defaultValue: true,
          field: 'isActive',
        },
        last_login_at: {
          type: Sequelize.DATE,
          allowNull: true,
          field: 'lastLoginAt',
        },
        reset_token: {
          type: Sequelize.STRING,
          allowNull: true,
          field: 'resetToken',
        },
        reset_token_expiry: {
          type: Sequelize.DATE,
          allowNull: true,
          field: 'resetTokenExpiry',
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

    // Create locations table if it doesn't exist
    if (!existingTables.includes('locations')) {
      await queryInterface.createTable('locations', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        address: {
          type: Sequelize.TEXT,
          allowNull: false,
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

    // Create categories table if it doesn't exist
    if (!existingTables.includes('categories')) {
      await queryInterface.createTable('categories', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        name: {
          type: Sequelize.STRING(100),
          allowNull: false,
          unique: true,
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

    // Create sales table if it doesn't exist
    if (!existingTables.includes('sales')) {
      await queryInterface.createTable('sales', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        customer_name: {
          type: Sequelize.STRING,
          allowNull: false,
          field: 'customerName',
        },
        customer_phone: {
          type: Sequelize.STRING,
          allowNull: true,
          field: 'customerPhone',
        },
        total_amount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          field: 'totalAmount',
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
        user_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          field: 'userId',
          references: {
            model: 'users',
            key: 'id',
          },
        },
        payment_method: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'cash',
          field: 'paymentMethod',
        },
        discount_type: {
          type: Sequelize.ENUM('amount', 'percentage'),
          allowNull: true,
          defaultValue: null,
          field: 'discountType',
        },
        discount_value: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true,
          defaultValue: 0,
          field: 'discountValue',
        },
        subtotal_amount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          field: 'subtotalAmount',
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
        },
      });
    }

    // Create inventory_logs table if it doesn't exist
    if (!existingTables.includes('inventory_logs')) {
      await queryInterface.createTable('inventory_logs', {
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
        change_type: {
          type: Sequelize.ENUM('sale', 'broken', 'received', 'adjusted', 'initial'),
          allowNull: false,
          field: 'changeType',
        },
        change_amount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          field: 'changeAmount',
        },
        previous_quantity: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          field: 'previousQuantity',
        },
        new_quantity: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          field: 'newQuantity',
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        user_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          field: 'userId',
          references: {
            model: 'users',
            key: 'id',
          },
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
        },
      });
    }

    // Create user_activities table if it doesn't exist
    if (!existingTables.includes('user_activities')) {
      await queryInterface.createTable('user_activities', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        user_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          field: 'userId',
          references: {
            model: 'users',
            key: 'id',
          },
        },
        action: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        resource: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        resource_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          field: 'resourceId',
        },
        details: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        ip_address: {
          type: Sequelize.STRING,
          allowNull: true,
          field: 'ipAddress',
        },
        user_agent: {
          type: Sequelize.TEXT,
          allowNull: true,
          field: 'userAgent',
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

      // Add indexes for user_activities
      await queryInterface.addIndex('user_activities', ['user_id']);
      await queryInterface.addIndex('user_activities', ['action']);
      await queryInterface.addIndex('user_activities', ['created_at']);
    }

    // Create global_attributes table if it doesn't exist
    if (!existingTables.includes('global_attributes')) {
      await queryInterface.createTable('global_attributes', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        name: {
          type: Sequelize.STRING(100),
          allowNull: false,
          unique: true,
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
    // Only drop tables that were created by this migration
    const existingTables = await queryInterface.showAllTables();

    if (existingTables.includes('user_activities')) {
      await queryInterface.dropTable('user_activities');
    }
    if (existingTables.includes('inventory_logs')) {
      await queryInterface.dropTable('inventory_logs');
    }
    if (existingTables.includes('sales')) {
      await queryInterface.dropTable('sales');
    }
    if (existingTables.includes('categories')) {
      await queryInterface.dropTable('categories');
    }
    if (existingTables.includes('locations')) {
      await queryInterface.dropTable('locations');
    }
    if (existingTables.includes('users')) {
      await queryInterface.dropTable('users');
    }
    if (existingTables.includes('global_attributes')) {
      await queryInterface.dropTable('global_attributes');
    }
  }
};
