const express = require('express');
const { Op } = require('sequelize');
const { Sale, SaleItem, Inventory, Product, Location, InventoryLog, User } = require('../models');
const { sequelize } = require('../config/database');

const router = express.Router();

// GET /api/dashboard - Get dashboard summary data
router.get('/', async (req, res) => {
  try {
    const { locationId } = req.query;
    
    // Build where clauses for location filtering
    const saleWhereClause = locationId ? { locationId } : {};
    const inventoryWhereClause = locationId ? { locationId } : {};
    const logWhereClause = locationId ? { locationId } : {};

    // Get total sales count and amount
    const salesData = await Sale.findAll({
      where: saleWhereClause,
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalSales'],
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'totalRevenue']
      ],
      raw: true
    });

    // Get total stock value
    const inventoryWithProducts = await Inventory.findAll({
      where: inventoryWhereClause,
      include: [{ model: Product, as: 'product' }]
    });

    const totalStockValue = inventoryWithProducts.reduce((total, item) => {
      return total + (parseFloat(item.quantitySqm) * parseFloat(item.product?.pricePerSqm || 0));
    }, 0);

    const stockValue = [{ totalStockValue }];

    // Get low stock items (less than 10 sqm)
    const lowStockItems = await Inventory.findAll({
      where: {
        ...inventoryWhereClause,
        quantitySqm: { [Op.lt]: 10 }
      },
      include: [
        { model: Product, as: 'product' },
        { model: Location, as: 'location' }
      ],
      order: [['quantitySqm', 'ASC']]
    });

    // Get recent activity (last 10 inventory changes)
    const recentActivity = await InventoryLog.findAll({
      where: logWhereClause,
      include: [
        { model: Product, as: 'product' },
        { model: Location, as: 'location' },
        { model: User, as: 'user', attributes: ['firstName', 'lastName'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    // Get sales by location (if no specific location filter)
    let salesByLocation = [];
    if (!locationId) {
      salesByLocation = await Sale.findAll({
        include: [{ model: Location, as: 'location' }],
        attributes: [
          'locationId',
          [sequelize.fn('COUNT', sequelize.col('Sale.id')), 'salesCount'],
          [sequelize.fn('SUM', sequelize.col('totalAmount')), 'totalRevenue']
        ],
        group: ['locationId', 'location.id', 'location.name', 'location.address'],
        raw: false
      });
    }

    // Get inventory summary by location
    const inventoryByLocation = await Inventory.findAll({
      where: inventoryWhereClause,
      include: [{ model: Location, as: 'location' }],
      attributes: [
        'locationId',
        [sequelize.fn('COUNT', sequelize.col('Inventory.id')), 'productCount'],
        [sequelize.fn('SUM', sequelize.col('Inventory.quantitySqm')), 'totalQuantity']
      ],
      group: ['locationId', 'location.id', 'location.name'],
      raw: false
    });

    res.json({
      message: 'Dashboard data retrieved successfully',
      totalSales: parseFloat(salesData[0]?.totalRevenue || 0),
      totalRevenue: parseFloat(salesData[0]?.totalRevenue || 0),
      totalStockValue: parseFloat(stockValue[0]?.totalStockValue || 0),
      recentActivity,
      summary: {
        totalSales: parseInt(salesData[0]?.totalSales || 0),
        totalRevenue: parseFloat(salesData[0]?.totalRevenue || 0),
        totalStockValue: parseFloat(stockValue[0]?.totalStockValue || 0),
        lowStockCount: lowStockItems.length
      },
      lowStockItems,
      salesByLocation,
      inventoryByLocation
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
