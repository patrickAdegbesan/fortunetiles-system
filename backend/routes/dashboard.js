const express = require('express');
const { Op } = require('sequelize');
const { Sale, SaleItem, Inventory, Product, Location, InventoryLog, User, Return, ReturnItem } = require('../models');
const { sequelize } = require('../config/database');

const router = express.Router();

// GET /api/dashboard - Get dashboard summary data
router.get('/', async (req, res) => {
  try {
    const { locationId, category } = req.query;
    
    console.log('Dashboard query parameters:', { locationId, category });
    
    // Build where clauses for location filtering - handle "all" case
    const saleWhereClause = {};
    if (locationId && locationId !== 'all') {
      saleWhereClause.locationId = parseInt(locationId);
    }
    
    const inventoryWhereClause = {};
    if (locationId && locationId !== 'all') {
      inventoryWhereClause.locationId = parseInt(locationId);
    }
    
    const logWhereClause = {};
    if (locationId && locationId !== 'all') {
      logWhereClause.locationId = parseInt(locationId);
    }

    // Build product filter for category
    const productWhereClause = category && category !== 'all' ? { category } : {};
    console.log('Product where clause:', productWhereClause);
    console.log('Will filter by category:', category && category !== 'all' ? 'YES' : 'NO');

    // Initialize variables for sales calculations
    let totalSales = 0;
    let totalRevenue = 0;

    // Get total sales count and amount with category filtering
    if (category && category !== 'all') {
      console.log('Filtering sales by category:', category);
      // When filtering by category, we need to join through sale items and products
      const salesData = await Sale.findAll({
        where: saleWhereClause,
        include: [{
          model: SaleItem,
          as: 'items',
          include: [{
            model: Product,
            as: 'product',
            where: productWhereClause,
            required: true
          }],
          required: true
        }],
        raw: false
      });
      
      console.log(`Found ${salesData.length} sales with category ${category}`);
      
      // Get unique sales to avoid double counting
      const uniqueSaleIds = [...new Set(salesData.map(sale => sale.id))];
      totalSales = uniqueSaleIds.length;
      
      // Calculate total revenue for unique sales
      totalRevenue = 0;
      const processedSales = new Set();
      
      for (const sale of salesData) {
        if (!processedSales.has(sale.id)) {
          totalRevenue += parseFloat(sale.totalAmount || 0);
          processedSales.add(sale.id);
        }
      }
      
      console.log(`Category filtering results: ${totalSales} sales, ${totalRevenue} revenue`);
    } else {
      // When not filtering by category, use simple aggregation
      const rawSalesData = await Sale.findAll({
        where: saleWhereClause,
        attributes: [
          [sequelize.fn('COUNT', sequelize.col('id')), 'totalSales'],
          [sequelize.fn('SUM', sequelize.col('totalAmount')), 'totalRevenue']
        ],
        raw: true
      });
      
      totalSales = parseInt(rawSalesData[0]?.totalSales || 0);
      totalRevenue = parseFloat(rawSalesData[0]?.totalRevenue || 0);
    }

    // Get total stock value with category filtering
    const inventoryWhereFilter = { ...inventoryWhereClause };
    const inventoryInclude = [{ 
      model: Product, 
      as: 'product',
      where: Object.keys(productWhereClause).length > 0 ? productWhereClause : undefined,
      required: Object.keys(productWhereClause).length > 0
    }];

    console.log('Inventory filtering:', { inventoryWhereFilter, productFilter: productWhereClause });

    const inventoryWithProducts = await Inventory.findAll({
      where: inventoryWhereFilter,
      include: inventoryInclude
    });

    console.log(`Found ${inventoryWithProducts.length} inventory items with filters`);

    const totalStockValue = inventoryWithProducts.reduce((total, item) => {
      const itemValue = parseFloat(item.quantitySqm) * parseFloat(item.product?.price || 0);
      console.log(`Item ${item.id}: ${item.quantitySqm} * ${item.product?.price} = ${itemValue}`);
      return total + itemValue;
    }, 0);

    console.log(`Total stock value: ${totalStockValue}`);

    const stockValue = [{ totalStockValue }];

    // Get low stock items (less than 10 sqm) with category filtering
    const lowStockItems = await Inventory.findAll({
      where: {
        ...inventoryWhereClause,
        quantitySqm: { [Op.lt]: 10 }
      },
      include: [
        { 
          model: Product, 
          as: 'product',
          where: Object.keys(productWhereClause).length > 0 ? productWhereClause : undefined,
          required: Object.keys(productWhereClause).length > 0
        },
        { model: Location, as: 'location' }
      ],
      order: [['quantitySqm', 'ASC']]
    });

    // Get recent activity (inventory changes and returns) with category filtering
    const inventoryActivity = await InventoryLog.findAll({
      where: logWhereClause,
      include: [
        { 
          model: Product, 
          as: 'product',
          where: Object.keys(productWhereClause).length > 0 ? productWhereClause : undefined,
          required: Object.keys(productWhereClause).length > 0
        },
        { model: Location, as: 'location' },
        { model: User, as: 'user', attributes: ['firstName', 'lastName'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: 15,
      raw: false
    });

    // Get recent returns activity
    const returnActivity = await Return.findAll({
      include: [
        {
          model: ReturnItem,
          as: 'items',
          include: [{ model: Product }]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 10,
      raw: false
    });

    // Combine and format all activities
    const allActivities = [
      ...inventoryActivity.map(log => ({
        id: `inv_${log.id}`,
        type: 'inventory',
        changeType: log.changeType,
        changeAmount: log.changeAmount,
        product: log.product,
        location: log.location,
        user: log.user,
        createdAt: log.createdAt
      })),
      ...returnActivity.map(ret => ({
        id: `ret_${ret.id}`,
        type: 'return',
        changeType: 'RETURN',
        changeAmount: `-${ret.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0}`,
        product: ret.items?.[0]?.Product || { name: `Return #${ret.id}` },
        status: ret.status,
        user: { firstName: 'Customer', lastName: '' },
        createdAt: ret.createdAt
      }))
    ];

    // Sort all activities by date and limit to 10
    const recentActivity = allActivities
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10);

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
      totalSales: totalSales,
      totalRevenue: totalRevenue,
      totalStockValue: parseFloat(stockValue[0]?.totalStockValue || 0),
      recentActivity,
      summary: {
        totalSales: totalSales,
        totalRevenue: totalRevenue,
        totalStockValue: parseFloat(stockValue[0]?.totalStockValue || 0),
        lowStockCount: lowStockItems.length
      },
      lowStockItems,
      salesByLocation,
      inventoryByLocation,
      appliedFilters: {
        locationId: locationId || 'all',
        category: category || 'all'
      }
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
