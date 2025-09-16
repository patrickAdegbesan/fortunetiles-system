'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Returns', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      saleId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Sales',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      processedById: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        }
      },
      returnDate: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      returnType: {
        type: Sequelize.ENUM('REFUND', 'EXCHANGE'),
        allowNull: false
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'),
        allowNull: false,
        defaultValue: 'PENDING'
      },
      totalRefundAmount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      refundMethod: {
        type: Sequelize.ENUM('CASH', 'BANK_TRANSFER', 'STORE_CREDIT'),
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    await queryInterface.createTable('ReturnItems', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      returnId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Returns',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      saleItemId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'SaleItems',
          key: 'id'
        }
      },
      productId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Products',
          key: 'id'
        }
      },
      locationId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Locations',
          key: 'id'
        }
      },
      quantity: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      returnReason: {
        type: Sequelize.STRING,
        allowNull: true
      },
      condition: {
        type: Sequelize.ENUM('PERFECT', 'GOOD', 'DAMAGED'),
        allowNull: false,
        defaultValue: 'PERFECT'
      },
      refundAmount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      exchangeProductId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Products',
          key: 'id'
        }
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('ReturnItems');
    await queryInterface.dropTable('Returns');
  }
};
