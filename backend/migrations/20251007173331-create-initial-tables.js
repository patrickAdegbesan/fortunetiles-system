'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Check which tables exist and only create missing ones
    const existingTables = await queryInterface.showAllTables();

    // Create locations table FIRST if it doesn't exist (other tables reference it)
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
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          field: 'createdAt',
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          field: 'updatedAt',
        },
      });
    }

    // Create users table if it doesn't exist (after locations since it references it)
    if (!existingTables.includes('users')) {
      await queryInterface.createTable('users', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        firstName: {
          type: Sequelize.STRING,
          allowNull: false,
          field: 'firstName',
        },
        lastName: {
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
        locationId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          field: 'locationId',
          references: {
            model: 'locations',
            key: 'id',
          },
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          defaultValue: true,
          field: 'isActive',
        },
        lastLoginAt: {
          type: Sequelize.DATE,
          allowNull: true,
          field: 'lastLoginAt',
        },
        resetToken: {
          type: Sequelize.STRING,
          allowNull: true,
          field: 'resetToken',
        },
        resetTokenExpiry: {
          type: Sequelize.DATE,
          allowNull: true,
          field: 'resetTokenExpiry',
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          field: 'createdAt',
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          field: 'updatedAt',
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
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          field: 'createdAt',
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          field: 'updatedAt',
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
        customerName: {
          type: Sequelize.STRING,
          allowNull: false,
          field: 'customerName',
        },
        customerPhone: {
          type: Sequelize.STRING,
          allowNull: true,
          field: 'customerPhone',
        },
        totalAmount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          field: 'totalAmount',
        },
        locationId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          field: 'locationId',
          references: {
            model: 'locations',
            key: 'id',
          },
        },
        userId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          field: 'userId',
          references: {
            model: 'users',
            key: 'id',
          },
        },
        paymentMethod: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'cash',
          field: 'paymentMethod',
        },
        discountType: {
          type: Sequelize.ENUM('amount', 'percentage'),
          allowNull: true,
          defaultValue: null,
          field: 'discountType',
        },
        discountValue: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true,
          defaultValue: 0,
          field: 'discountValue',
        },
        subtotalAmount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          field: 'subtotalAmount',
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          field: 'createdAt',
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: true,
          field: 'updatedAt',
        },
      });
    }

    // NOTE: inventory_logs table will be created by later migrations (20251007173400-update-inventory-log.js)
    // It references products table which is created in later migrations, so we skip it here
    // to avoid foreign key reference errors

    // Create user_activities table if it doesn't exist
    if (!existingTables.includes('user_activities')) {
      await queryInterface.createTable('user_activities', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        userId: {
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
        resourceId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          field: 'resourceId',
        },
        details: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        ipAddress: {
          type: Sequelize.STRING,
          allowNull: true,
          field: 'ipAddress',
        },
        userAgent: {
          type: Sequelize.TEXT,
          allowNull: true,
          field: 'userAgent',
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          field: 'createdAt',
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          field: 'updatedAt',
        },
      });

      // Add indexes for user_activities
      await queryInterface.addIndex('user_activities', ['userId']);
      await queryInterface.addIndex('user_activities', ['action']);
      await queryInterface.addIndex('user_activities', ['createdAt']);
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
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          field: 'createdAt',
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          field: 'updatedAt',
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
