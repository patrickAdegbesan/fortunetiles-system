const express = require('express');
const router = express.Router();
const { User, Location, Product, Inventory, Sale, SaleItem } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

// GET /api/reports/sales-daily - Daily sales reports
router.get('/sales-daily', authenticateToken, requireRole(['owner', 'manager']), async (req, res) => {
  try {
    const { startDate, endDate, locationId } = req.query;
    
    // Default to last 30 days if no dates provided
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    
    // Set end date to end of day
    end.setHours(23, 59, 59, 999);

    const whereClause = {
      createdAt: {
        [Op.between]: [start, end]
      }
    };

    if (locationId) {
      whereClause.locationId = locationId;
    }

    // Get daily sales data
    const dailySales = await Sale.findAll({
      attributes: [
        [sequelize.fn('DATE', sequelize.col('Sale.createdAt')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('Sale.id')), 'totalSales'],
        [sequelize.fn('SUM', sequelize.col('Sale.totalAmount')), 'totalRevenue'],
        [sequelize.fn('SUM', sequelize.col('Sale.subtotalAmount')), 'totalSubtotal'],
        [sequelize.fn('AVG', sequelize.col('Sale.totalAmount')), 'averageOrderValue']
      ],
      where: whereClause,
      group: [sequelize.fn('DATE', sequelize.col('Sale.createdAt'))],
      order: [[sequelize.fn('DATE', sequelize.col('Sale.createdAt')), 'ASC']],
      raw: true
    });

    // Get summary statistics
    const summary = await Sale.findOne({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalTransactions'],
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'totalRevenue'],
        [sequelize.fn('SUM', sequelize.col('subtotalAmount')), 'totalSubtotal'],
        [sequelize.fn('AVG', sequelize.col('totalAmount')), 'averageOrderValue'],
        [sequelize.fn('MIN', sequelize.col('totalAmount')), 'minOrderValue'],
        [sequelize.fn('MAX', sequelize.col('totalAmount')), 'maxOrderValue']
      ],
      where: whereClause,
      raw: true
    });

    // Calculate total discounts
    const totalDiscount = (summary.totalSubtotal || 0) - (summary.totalRevenue || 0);

    res.json({
      message: 'Daily sales report retrieved successfully',
      data: {
        dailySales: dailySales.map(day => {
          const dailyDiscount = (day.totalSubtotal || 0) - (day.totalRevenue || 0);
          return {
            date: day.date,
            totalSales: parseInt(day.totalSales),
            totalRevenue: parseFloat(day.totalRevenue || 0),
            totalDiscount: parseFloat(dailyDiscount || 0),
            averageOrderValue: parseFloat(day.averageOrderValue || 0)
          };
        }),
        summary: {
          totalTransactions: parseInt(summary.totalTransactions || 0),
          totalRevenue: parseFloat(summary.totalRevenue || 0),
          totalDiscount: parseFloat(totalDiscount || 0),
          averageOrderValue: parseFloat(summary.averageOrderValue || 0),
          minOrderValue: parseFloat(summary.minOrderValue || 0),
          maxOrderValue: parseFloat(summary.maxOrderValue || 0)
        },
        period: {
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0]
        }
      }
    });

  } catch (error) {
    console.error('Daily sales report error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/reports/inventory-valuation - Stock value reports
router.get('/inventory-valuation', authenticateToken, requireRole(['owner', 'manager']), async (req, res) => {
  try {
    const { locationId } = req.query;

    const whereClause = {};
    if (locationId) {
      whereClause.locationId = locationId;
    }

    // Get inventory with product details
    const inventoryData = await Inventory.findAll({
      where: whereClause,
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'categories', 'price', 'isActive']
        },
        {
          model: Location,
          as: 'location',
          attributes: ['id', 'name']
        }
      ],
      attributes: ['id', 'quantitySqm', 'locationId', 'productId']
    });

    // Calculate valuation data
    const valuationData = inventoryData.map(item => {
      // Skip items with missing product data
      if (!item.product || !item.location) {
        return null;
      }
      
      const price = parseFloat(item.product.price) || 0;
      const quantity = parseFloat(item.quantitySqm) || 0;
      const stockValue = quantity * price;
      
      return {
        productId: item.product.id,
        productName: item.product.name,
        category: item.product.categories?.[0] || 'Uncategorized',
        location: item.location.name,
        quantitySqm: quantity,
        pricePerSqm: price,
        stockValue: stockValue,
        isActive: item.product.isActive
      };
    }).filter(item => item !== null);

    // Calculate summary by category
    const categoryValuation = valuationData.reduce((acc, item) => {
      const category = item.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = {
          category,
          totalQuantity: 0,
          totalValue: 0,
          productCount: 0
        };
      }
      acc[category].totalQuantity += item.quantitySqm;
      acc[category].totalValue += item.stockValue;
      acc[category].productCount += 1;
      return acc;
    }, {});

    // Calculate overall summary
    const totalValuation = valuationData.reduce((sum, item) => sum + item.stockValue, 0);
    const totalQuantity = valuationData.reduce((sum, item) => sum + item.quantitySqm, 0);
    const activeProducts = valuationData.filter(item => item.isActive).length;
    const inactiveProducts = valuationData.filter(item => !item.isActive).length;

    res.json({
      message: 'Inventory valuation report retrieved successfully',
      data: {
        inventoryItems: valuationData,
        categoryBreakdown: Object.values(categoryValuation),
        summary: {
          totalValuation: totalValuation,
          totalQuantity: totalQuantity,
          totalProducts: valuationData.length,
          activeProducts: activeProducts,
          inactiveProducts: inactiveProducts,
          averageValuePerSqm: totalQuantity > 0 ? totalValuation / totalQuantity : 0
        }
      }
    });

  } catch (error) {
    console.error('Inventory valuation report error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/reports/profit-margin - Profitability analysis
router.get('/profit-margin', authenticateToken, requireRole(['owner', 'manager']), async (req, res) => {
  try {
    const { startDate, endDate, locationId } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const whereClause = {
      createdAt: {
        [Op.between]: [start, end]
      }
    };

    if (locationId) {
      whereClause.locationId = locationId;
    }

    // Get sales with items and product details
    let salesData = await Sale.findAll({
      where: whereClause,
      attributes: ['id', 'customerName', 'customerPhone', 'totalAmount', 'subtotalAmount', 'discountType', 'discountValue', 'locationId', 'userId', 'paymentMethod', 'createdAt'],
      include: [
        {
          model: SaleItem,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'name', 'categories', 'price']
            }
          ]
        },
        {
          model: Location,
          as: 'location',
          attributes: ['id', 'name']
        }
      ]
    });

    // Calculate profit margins (assuming 70% of sale price is cost for simplification)
    const COST_RATIO = 0.7; // This should ideally come from product cost data

    const profitabilityData = [];
    let totalRevenue = 0;
    let totalCost = 0;
    let totalDiscount = 0;

    // Filter out any sales with null data
    salesData = salesData.filter(sale => 
      sale && 
      sale.items && 
      Array.isArray(sale.items) && 
      sale.items.every(item => item && item.product)
    );
    
    salesData.forEach(sale => {
      const discountAmount = (() => {
        if (!sale.discountType || !sale.discountValue || !sale.subtotalAmount) return 0;
        if (sale.discountType === 'percentage') {
          return (sale.subtotalAmount * sale.discountValue) / 100;
        } else if (sale.discountType === 'amount') {
          return Math.min(sale.discountValue, sale.subtotalAmount);
        }
        return 0;
      })();

      sale.items.forEach(item => {
        if (!item.product) return; // Skip items without product data
        const revenue = parseFloat(item.lineTotal);
        const estimatedCost = revenue * COST_RATIO;
        const profit = revenue - estimatedCost;
        const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

        totalRevenue += revenue;
        totalCost += estimatedCost;
        totalDiscount += discountAmount;

        profitabilityData.push({
          saleId: sale.id,
          productId: item.product?.id || 0,
          productName: item.product?.name || 'Unknown Product',
          category: item.product?.categories?.[0] || 'Uncategorized',
          location: sale.location?.name || 'Unknown Location',
          quantitySqm: parseFloat(item.quantity || 0),
          unitPrice: parseFloat(item.unitPrice),
          revenue: revenue,
          estimatedCost: estimatedCost,
          profit: profit,
          profitMargin: profitMargin,
          saleDate: sale.createdAt
        });
      });
    });

    // Group by category for analysis
    const categoryProfitability = profitabilityData.reduce((acc, item) => {
      const category = item.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = {
          category,
          totalRevenue: 0,
          totalCost: 0,
          totalProfit: 0,
          itemCount: 0
        };
      }
      acc[category].totalRevenue += item.revenue;
      acc[category].totalCost += item.estimatedCost;
      acc[category].totalProfit += item.profit;
      acc[category].itemCount += 1;
      return acc;
    }, {});

    // Calculate profit margins for categories
    Object.values(categoryProfitability).forEach(category => {
      category.profitMargin = category.totalRevenue > 0 ? 
        (category.totalProfit / category.totalRevenue) * 100 : 0;
    });

    const totalProfit = totalRevenue - totalCost;
    const overallProfitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    res.json({
      message: 'Profit margin report retrieved successfully',
      data: {
        profitabilityItems: profitabilityData,
        categoryProfitability: Object.values(categoryProfitability),
        summary: {
          totalRevenue: totalRevenue,
          totalCost: totalCost,
          totalDiscount: totalDiscount,
          totalProfit: totalProfit,
          overallProfitMargin: overallProfitMargin,
          totalTransactions: salesData.length,
          averageProfitPerTransaction: salesData.length > 0 ? totalProfit / salesData.length : 0
        },
        period: {
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0]
        }
      }
    });

  } catch (error) {
    console.error('Profit margin report error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/reports/top-products - Best sellers report
router.get('/top-products', authenticateToken, requireRole(['owner', 'manager']), async (req, res) => {
  try {
    const { startDate, endDate, locationId, limit = 10 } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    let whereClause = {
      createdAt: {
        [Op.between]: [start, end]
      }
    };

    if (locationId) {
      whereClause.locationId = locationId;
    }

    // Get top products by quantity sold and filter out any items with null products
    let topProductsByQuantity = await SaleItem.findAll({
      attributes: [
        'productId',
        [sequelize.fn('SUM', sequelize.col('SaleItem.quantity')), 'totalQuantitySold'],
        [sequelize.fn('COUNT', sequelize.col('SaleItem.id')), 'totalTransactions'],
        [sequelize.fn('SUM', sequelize.col('SaleItem.lineTotal')), 'totalRevenue'],
        [sequelize.fn('AVG', sequelize.col('SaleItem.unitPrice')), 'averagePrice']
      ],
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'categories', 'price']
        },
        {
          model: Sale,
          as: 'sale',
          attributes: [],
          where: whereClause
        }
      ],
      group: ['SaleItem.productId', 'product.id'],
      order: [[sequelize.fn('SUM', sequelize.col('SaleItem.quantity')), 'DESC']],
      limit: parseInt(limit),
      raw: false
    });

    // Filter out entries with null products
    topProductsByQuantity = topProductsByQuantity.filter(item => item && item.product);
    
    // Get top products by revenue
    let topProductsByRevenue = await SaleItem.findAll({
      attributes: [
        'productId',
        [sequelize.fn('SUM', sequelize.col('SaleItem.lineTotal')), 'totalRevenue'],
        [sequelize.fn('SUM', sequelize.col('SaleItem.quantity')), 'totalQuantitySold'],
        [sequelize.fn('COUNT', sequelize.col('SaleItem.id')), 'totalTransactions'],
        [sequelize.fn('AVG', sequelize.col('SaleItem.unitPrice')), 'averagePrice']
      ],
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'categories', 'price']
        },
        {
          model: Sale,
          as: 'sale',
          attributes: [],
          where: whereClause
        }
      ],
      group: ['SaleItem.productId', 'product.id'],
      order: [[sequelize.fn('SUM', sequelize.col('SaleItem.lineTotal')), 'DESC']],
      limit: parseInt(limit),
      raw: false
    });

    // Format the data
    const formatProductData = (products) => {
      return products.map(item => ({
        productId: item.product?.id || 0,
        productName: item.product?.name || 'Unknown Product',
        category: item.product?.categories?.[0] || 'Uncategorized',
        currentPrice: parseFloat(item.product?.price || 0),
        totalQuantitySold: parseFloat(item.dataValues.totalQuantitySold || 0),
        totalRevenue: parseFloat(item.dataValues.totalRevenue || 0),
        totalTransactions: parseInt(item.dataValues.totalTransactions || 0),
        averagePrice: parseFloat(item.dataValues.averagePrice || 0),
        averageQuantityPerTransaction: item.dataValues.totalTransactions > 0 ?
          parseFloat(item.dataValues.totalQuantitySold) / parseInt(item.dataValues.totalTransactions) : 0
      }));
    };

    // Get category performance
    const categoryPerformance = await SaleItem.findAll({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('SaleItem.quantity')), 'totalQuantitySold'],
        [sequelize.fn('SUM', sequelize.col('SaleItem.lineTotal')), 'totalRevenue'],
        [sequelize.fn('COUNT', sequelize.col('SaleItem.id')), 'totalTransactions']
      ],
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['categories']
        },
        {
          model: Sale,
          as: 'sale',
          attributes: [],
          where: whereClause
        }
      ],
      group: ['product.categories'],
      order: [[sequelize.fn('SUM', sequelize.col('SaleItem.lineTotal')), 'DESC']],
      raw: true
    });

    // Filter out entries with null products
    topProductsByRevenue = topProductsByRevenue.filter(item => item && item.product);
    
    res.json({
      message: 'Top products report retrieved successfully',
      data: {
        topProductsByQuantity: formatProductData(topProductsByQuantity),
        topProductsByRevenue: formatProductData(topProductsByRevenue),
        categoryPerformance: categoryPerformance.map(cat => ({
          category: cat['product.categories']?.[0] || 'Uncategorized',
          totalQuantitySold: parseFloat(cat.totalQuantitySold || 0),
          totalRevenue: parseFloat(cat.totalRevenue || 0),
          totalTransactions: parseInt(cat.totalTransactions || 0)
        })),
        period: {
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0]
        }
      }
    });

  } catch (error) {
    console.error('Top products report error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
