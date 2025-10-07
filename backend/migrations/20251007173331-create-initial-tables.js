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
        firstName: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        lastName: {
          type: Sequelize.STRING,
          allowNull: false,
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
          references: {
            model: 'locations',
            key: 'id',
          },
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          defaultValue: true,
        },
        lastLoginAt: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        resetToken: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        resetTokenExpiry: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        updatedAt: {
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
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        updatedAt: {
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
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        updatedAt: {
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
        customerName: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        customerPhone: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        totalAmount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
        },
        locationId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'locations',
            key: 'id',
          },
        },
        userId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
        },
        paymentMethod: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'cash',
        },
        discountType: {
          type: Sequelize.ENUM('amount', 'percentage'),
          allowNull: true,
          defaultValue: null,
        },
        discountValue: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true,
          defaultValue: 0,
        },
        subtotalAmount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
        },
        createdAt: {
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
        productId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'products',
            key: 'id',
          },
        },
        locationId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'locations',
            key: 'id',
          },
        },
        changeType: {
          type: Sequelize.ENUM('sale', 'broken', 'received', 'adjusted', 'initial'),
          allowNull: false,
        },
        changeAmount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
        },
        previousQuantity: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
        },
        newQuantity: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        userId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id',
          },
        },
        createdAt: {
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
        userId: {
          type: Sequelize.INTEGER,
          allowNull: false,
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
        },
        details: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        ipAddress: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        userAgent: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
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
        },
        updatedAt: {
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
