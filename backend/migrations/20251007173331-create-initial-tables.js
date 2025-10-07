'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Create users table
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

    // Create locations table
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

    // Create categories table
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

    // Create product_types table
    await queryInterface.createTable('product_types', {
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
      unit_of_measure: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      attributes: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
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

    // Create products table
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
      productTypeId: {
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
      supplierCode: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      imageUrl: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      deletedAt: {
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

    // Create inventory table
    await queryInterface.createTable('inventory', {
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
      quantitySqm: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // Create sales table
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

    // Create sale_items table
    await queryInterface.createTable('sale_items', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      saleId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'sales',
          key: 'id',
        },
      },
      productId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'products',
          key: 'id',
        },
      },
      quantity: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      unit: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      unitPrice: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      lineTotal: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
    });

    // Create returns table
    await queryInterface.createTable('returns', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      saleId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'sales',
          key: 'id',
        },
      },
      processedBy: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      returnDate: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      returnType: {
        type: Sequelize.ENUM('REFUND', 'EXCHANGE'),
        allowNull: false,
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      totalRefundAmount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      refundMethod: {
        type: Sequelize.ENUM('CASH', 'BANK_TRANSFER', 'STORE_CREDIT'),
        allowNull: true,
      },
      notes: {
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

    // Create return_items table
    await queryInterface.createTable('return_items', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      returnId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'returns',
          key: 'id',
        },
      },
      saleItemId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'sale_items',
          key: 'id',
        },
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
      quantity: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      returnReason: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      condition: {
        type: Sequelize.ENUM('PERFECT', 'GOOD', 'DAMAGED'),
        allowNull: false,
        defaultValue: 'PERFECT',
      },
      refundAmount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      exchangeProductId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'products',
          key: 'id',
        },
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

    // Create inventory_logs table
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

    // Create user_activities table
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

    // Create global_attributes table
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

    // Add indexes
    await queryInterface.addIndex('inventory', ['productId', 'locationId'], {
      unique: true,
    });
    await queryInterface.addIndex('user_activities', ['userId']);
    await queryInterface.addIndex('user_activities', ['action']);
    await queryInterface.addIndex('user_activities', ['createdAt']);
  },

  async down (queryInterface, Sequelize) {
    // Drop tables in reverse order to avoid foreign key constraints
    await queryInterface.dropTable('user_activities');
    await queryInterface.dropTable('inventory_logs');
    await queryInterface.dropTable('return_items');
    await queryInterface.dropTable('returns');
    await queryInterface.dropTable('sale_items');
    await queryInterface.dropTable('sales');
    await queryInterface.dropTable('inventory');
    await queryInterface.dropTable('products');
    await queryInterface.dropTable('product_types');
    await queryInterface.dropTable('categories');
    await queryInterface.dropTable('locations');
    await queryInterface.dropTable('users');
    await queryInterface.dropTable('global_attributes');
  }
};
