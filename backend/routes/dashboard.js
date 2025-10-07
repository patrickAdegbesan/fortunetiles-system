const express = require('express');
const { Op } = require('sequelize');
const { Sale, SaleItem, Inventory, Product, Location, InventoryLog, User, Return, ReturnItem } = require('../models');
const { sequelize } = require('../config/database');

const router = express.Router();

// GET /api/dashboard - Get dashboard summary data
router.get('/', async (req, res) => {
  try {
    const { locationId, category, startDate, endDate } = req.query;

    console.log('Dashboard query parameters:', { locationId, category, startDate, endDate });
    
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

    // Add date range filtering
    if (startDate && endDate) {
      const startDateTime = new Date(startDate + 'T00:00:00.000Z');
      const endDateTime = new Date(endDate + 'T23:59:59.999Z');
      
      saleWhereClause.createdAt = {
        [Op.between]: [startDateTime, endDateTime]
      };
      logWhereClause.createdAt = {
        [Op.between]: [startDateTime, endDateTime]
      };
    }

    // Build product filter for category
    const productWhereClause = category && category !== 'all' ? { category } : {};
    console.log('Product where clause:', productWhereClause);
    console.log('Will filter by category:', category && category !== 'all' ? 'YES' : 'NO');

    // Initialize variables for sales calculations
    let totalSales = 0;
    let totalRevenue = 0;
    let totalDiscount = 0;

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
      
      // Calculate total revenue and discounts for unique sales
      totalRevenue = 0;
      totalDiscount = 0;
      const processedSales = new Set();

      for (const sale of salesData) {
        if (!processedSales.has(sale.id)) {
          totalRevenue += parseFloat(sale.totalAmount || 0);
          const discount = Math.abs((sale.subtotalAmount || sale.totalAmount || 0) - (sale.totalAmount || 0));
          totalDiscount += parseFloat(discount || 0);
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
          [sequelize.fn('SUM', sequelize.col('totalAmount')), 'totalRevenue'],
          [sequelize.fn('SUM', sequelize.col('subtotalAmount')), 'totalSubtotal']
        ],
        raw: true
      });

      totalSales = parseInt(rawSalesData[0]?.totalSales || 0);
      totalRevenue = parseFloat(rawSalesData[0]?.totalRevenue || 0);
      totalDiscount = Math.abs(parseFloat((rawSalesData[0]?.totalSubtotal || 0) - (rawSalesData[0]?.totalRevenue || 0)));
    }

    // Get total stock value with proper aggregation by product
    const inventoryWhereFilter = { ...inventoryWhereClause };
    
    console.log('Inventory filtering:', { inventoryWhereFilter, productFilter: productWhereClause });

    // Aggregate inventory quantities by product
    const aggregatedInventory = await Inventory.findAll({
      attributes: [
        'productId',
        [sequelize.fn('SUM', sequelize.col('quantitySqm')), 'totalQuantity']
      ],
      where: inventoryWhereFilter,
      include: [{ 
        model: Product, 
        as: 'product',
        where: Object.keys(productWhereClause).length > 0 ? productWhereClause : undefined,
        required: Object.keys(productWhereClause).length > 0 ? true : false,
        attributes: ['id', 'name', 'price']
      }],
      group: ['productId', 'product.id'],
      raw: false
    });

    console.log(`Found ${aggregatedInventory.length} unique products with aggregated inventory`);

    const totalStockValue = aggregatedInventory.reduce((total, item) => {
      const totalQty = parseFloat(item.dataValues.totalQuantity || 0);
      const price = parseFloat(item.product?.price || 0);
      const itemValue = totalQty * price;
      console.log(`Product ${item.product?.name}: ${totalQty} units * $${price} = $${itemValue}`);
      return total + itemValue;
    }, 0);

    console.log(`Total stock value: ${totalStockValue}`);

    const stockValue = [{ totalStockValue }];

    // Get ALL products first, then check their inventory levels
    const allProducts = await Product.findAll({
      where: Object.keys(productWhereClause).length > 0 ? productWhereClause : undefined,
      attributes: ['id', 'name', 'price', 'attributes']
    });

    // Get inventory data for products that have it
    const rawLowStock = await Inventory.findAll({
      attributes: [
        'id',
        'productId',
        [sequelize.fn('SUM', sequelize.col('quantitySqm')), 'totalQuantity']
      ],
      where: inventoryWhereFilter,
      include: [
        {
          model: Product,
          as: 'product',
          where: Object.keys(productWhereClause).length > 0 ? productWhereClause : undefined,
          required: true,
          attributes: ['id', 'name', 'price', 'attributes']
        }
      ],
      group: ['Inventory.productId', 'Inventory.id', 'product.id'],
      raw: false
    });

    // Create a map of products with inventory data
    const inventoryMap = rawLowStock.reduce((acc, item) => {
      const key = item.productId;
      if (!acc[key]) {
        acc[key] = {
          productId: item.productId,
          totalQuantity: 0,
          product: item.product
        };
      }
      acc[key].totalQuantity += parseFloat(item.dataValues.totalQuantity || 0);
      return acc;
    }, {});

    // Create complete low stock list including products with no inventory records
    const completeProductList = allProducts.map(product => {
      const inventoryData = inventoryMap[product.id];
      return {
        productId: product.id,
        totalQuantity: inventoryData ? inventoryData.totalQuantity : 0,
        product: product
      };
    });

    // Filter for low stock (≤ 10) and sort
    const aggregatedLowStock = completeProductList
      .filter(item => item.totalQuantity <= 10)
      .sort((a, b) => a.totalQuantity - b.totalQuantity);

    // Calculate sales volume and prioritize
    const prioritizedLowStockItems = aggregatedLowStock.map(item => {
      const totalQuantity = parseFloat(item.totalQuantity || 0);
      const totalSalesVolume = 0; // TODO: Calculate sales volume separately
      
      const stockStatus = totalQuantity <= 0 ? 'OUT_OF_STOCK' : 
                         totalQuantity <= 3 ? 'CRITICAL' : 'LOW';
      
      return {
        id: item.productId,
        productId: item.productId,
        quantitySqm: totalQuantity,
        productName: item.product?.name || 'Unknown Product',
        customAttributes: item.product?.attributes || {},
        location: { name: 'All Locations' }, // Since we're aggregating across locations
        totalSalesVolume,
        stockStatus,
        priority: stockStatus === 'OUT_OF_STOCK' ? 3 :
                  stockStatus === 'CRITICAL' ? 2 : 1
      };
    }).sort((a, b) => {
      // First sort by priority (out of stock first), then by sales volume
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return b.totalSalesVolume - a.totalSalesVolume;
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
    const returnWhereClause = {};
    if (startDate && endDate) {
      returnWhereClause.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate + ' 23:59:59')]
      };
    }

    const returnActivity = await Return.findAll({
      where: returnWhereClause,
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
      const salesByLocationWhereClause = {};
      // Apply date range filtering to sales by location
      if (startDate && endDate) {
        const startDateTime = new Date(startDate + 'T00:00:00.000Z');
        const endDateTime = new Date(endDate + 'T23:59:59.999Z');
        salesByLocationWhereClause.createdAt = {
          [Op.between]: [startDateTime, endDateTime]
        };
      }
      
      salesByLocation = await Sale.findAll({
        where: salesByLocationWhereClause,
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

    // Calculate correct inventory counts
    const productsWithStock = aggregatedInventory.filter(item => {
      const totalQty = parseFloat(item.dataValues.totalQuantity || 0);
      return totalQty > 0;
    }).length;

    const productsWithInventoryRecords = aggregatedInventory.length;
    const productsOutOfStock = prioritizedLowStockItems.filter(item => item.stockStatus === 'OUT_OF_STOCK').length;

    console.log(`📊 Inventory Summary:
      - Products with stock > 0: ${productsWithStock}
      - Products with inventory records: ${productsWithInventoryRecords}
      - Products out of stock: ${productsOutOfStock}
    `);

    res.json({
      message: 'Dashboard data retrieved successfully',
      totalSales: totalSales,
      totalRevenue: totalRevenue,
      totalDiscount: totalDiscount,
      totalStockValue: parseFloat(stockValue[0]?.totalStockValue || 0),
      recentActivity,
      summary: {
        totalSales: totalSales,
        totalRevenue: totalRevenue,
        totalDiscount: totalDiscount,
        totalStockValue: parseFloat(stockValue[0]?.totalStockValue || 0),
        lowStockCount: prioritizedLowStockItems.length,
        outOfStockCount: prioritizedLowStockItems.filter(item => item.stockStatus === 'OUT_OF_STOCK').length,
        criticalStockCount: prioritizedLowStockItems.filter(item => item.stockStatus === 'CRITICAL').length,
        productsInStock: productsWithStock, // Products with quantity > 0
        totalProductsWithInventoryRecords: productsWithInventoryRecords // Products with any inventory record
      },
      lowStockItems: prioritizedLowStockItems,
      salesByLocation,
      inventoryByLocation,
      appliedFilters: {
        locationId: locationId || 'all',
        category: category || 'all',
        startDate: startDate || null,
        endDate: endDate || null
      }
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
