const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Sale, SaleItem, Product, User, Location, Return } = require('../models');
const auth = require('../middleware/auth');

// Get all orders/sales with customer details
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, locationId } = req.query;
    
    // Build where clause for date and location filtering
    const whereAnd = [];
    
    // Add date range filtering (snake_case column)
    if (startDate && endDate) {
      const startDateTime = new Date(startDate + 'T00:00:00.000Z');
      const endDateTime = new Date(endDate + 'T23:59:59.999Z');
      whereAnd.push(require('../config/database').sequelize.where(
        require('../config/database').sequelize.col('created_at'),
        { [Op.between]: [startDateTime, endDateTime] }
      ));
    }
    
    // Add location filtering
    if (locationId && locationId !== 'all') {
      whereAnd.push({ locationId: parseInt(locationId) });
    }
    
    const sales = await Sale.findAll({
      where: whereAnd.length ? { [Op.and]: whereAnd } : {},
      include: [
        {
          model: SaleItem,
          as: 'items',
          attributes: ['id', 'saleId', 'productId', 'quantity', 'unitPrice', 'baseUnitPrice', 'markupPrice', 'markupBy', 'totalPrice'],
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'name', 'categories', 'description', 'price']
            }
          ]
        },
        {
          model: User,
          as: 'cashier',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
        // Temporarily removed Return association due to database schema mismatch
        // {
        //   model: Return,
        //   as: 'returns',
        //   required: false,
        //   attributes: ['id', 'returnType', 'status', 'totalRefundAmount', 'created_at']
        // }
      ],
      order: [['created_at', 'DESC']],
      limit: 1000 // Limit to last 1000 orders for performance
    });

    // Format the data for the frontend
    const formattedSales = sales.map(sale => {
  const saleData = sale.toJSON();
      
      // Format items with product names
      const formattedItems = saleData.items?.map(item => ({
        id: item.id,
        productId: item.productId,
        productName: item.product?.name || 'Unknown Product',
        categories: item.product?.categories || [],
        description: item.product?.description || '',
        quantity: item.quantity,
        unit: item.product?.unitOfMeasure || 'sqm',
        unitPrice: parseFloat(item.unitPrice),
        baseUnitPrice: parseFloat(item.baseUnitPrice || item.unitPrice),
        markupPrice: parseFloat(item.markupPrice || 0),
        markupBy: item.markupBy || null,
        totalPrice: parseFloat(item.totalPrice)
      })) || [];

      return {
        id: saleData.id,
        customerName: saleData.customerName || null,
        customerPhone: saleData.customerPhone || null,
        customerEmail: saleData.customerEmail || null,
        subtotalAmount: parseFloat(saleData.subtotalAmount || saleData.totalAmount),
        total: parseFloat(saleData.totalAmount),
        discountType: saleData.discountType,
        discountValue: saleData.discountValue,
        paymentMethod: saleData.paymentMethod || 'cash',
        status: 'completed', // Default to completed since we can't check returns right now
        createdAt: saleData.createdAt || new Date().toISOString(), // Fallback to current date if missing
        saleDate: saleData.createdAt || new Date().toISOString(), // Use createdAt as saleDate with fallback
        items: formattedItems,
        cashier: saleData.cashier ? {
          id: saleData.cashier.id,
          name: `${saleData.cashier.firstName} ${saleData.cashier.lastName}`,
          email: saleData.cashier.email
        } : null,
        location: 'Main Store', // Hardcoded since location association is temporarily removed
        notes: saleData.notes || '',
        returns: [] // Empty array since we can't fetch returns right now
      };
    });

    res.json(formattedSales);
  } catch (error) {
    console.error('Error fetching orders:', error);
    console.error('Error stack:', error.stack);
    // Don't try to log variables that might not be defined yet
    if (req && req.query) {
      console.error('Query parameters:', req.query);
    }
    
    // Make sure we send a response
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to fetch orders',
        details: error.message
      });
    }
  }
});

// Get specific order by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const sale = await Sale.findByPk(id, {
      include: [
        {
          model: SaleItem,
          as: 'items',
          attributes: ['id', 'saleId', 'productId', 'quantity', 'unitPrice', 'totalPrice'],
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'name', 'categories', 'description', 'price']
            }
          ]
        },
        {
          model: User,
          as: 'cashier',
          attributes: ['id', 'username', 'email']
        }
      ]
    });

    if (!sale) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Format the data
    const saleData = sale.toJSON();
    
    const formattedItems = saleData.items?.map(item => ({
      id: item.id,
      productId: item.productId,
      productName: item.product?.name || 'Unknown Product',
      categories: item.product?.categories || [],
      description: item.product?.description || '',
      quantity: item.quantity,
      unit: item.product?.unitOfMeasure || 'sqm',
      unitPrice: parseFloat(item.unitPrice),
      baseUnitPrice: parseFloat(item.unitPrice), // Use unitPrice as base
      markupPrice: 0, // No markup data available
      markupBy: null,
      totalPrice: parseFloat(item.totalPrice)
    })) || [];

    const formattedSale = {
      id: saleData.id,
      customerName: saleData.customerName || null,
      customerPhone: saleData.customerPhone || null,
      customerEmail: saleData.customerEmail || null,
      subtotalAmount: parseFloat(saleData.subtotalAmount || saleData.totalAmount),
      total: parseFloat(saleData.totalAmount),
      discountType: saleData.discountType,
      discountValue: saleData.discountValue,
      paymentMethod: saleData.paymentMethod || 'cash',
      status: saleData.status || 'completed',
      createdAt: saleData.createdAt,
      saleDate: saleData.saleDate || saleData.createdAt,
      items: formattedItems,
      cashier: saleData.cashier ? {
        id: saleData.cashier.id,
        username: saleData.cashier.username,
        email: saleData.cashier.email
      } : null,
      location: saleData.location || 'Main Store',
      notes: saleData.notes || ''
    };

    res.json(formattedSale);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ 
      error: 'Failed to fetch order',
      details: error.message 
    });
  }
});

// Search orders
router.get('/search/:term', async (req, res) => {
  try {
    const { term } = req.params;
    const { Op } = require('sequelize');
    
    const sales = await Sale.findAll({
      where: {
        [Op.or]: [
          { id: { [Op.like]: `%${term}%` } },
          { customerName: { [Op.like]: `%${term}%` } },
          { customerPhone: { [Op.like]: `%${term}%` } },
          { customerEmail: { [Op.like]: `%${term}%` } }
        ]
      },
      include: [
        {
          model: SaleItem,
          as: 'items',
          attributes: ['id', 'saleId', 'productId', 'quantity', 'unitPrice', 'totalPrice'],
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'name', 'categories', 'description']
            }
          ]
        },
        {
          model: User,
          as: 'cashier',
          attributes: ['id', 'username', 'email']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: 100
    });

    const formattedSales = sales.map(sale => {
      const saleData = sale.toJSON();
      
      const formattedItems = saleData.items?.map(item => ({
        id: item.id,
        productId: item.productId,
        productName: item.product?.name || 'Unknown Product',
        category: item.product?.categories?.[0] || '',
        description: item.product?.description || '',
        quantity: item.quantity,
        unit: item.product?.unitOfMeasure || 'sqm',
        unitPrice: parseFloat(item.unitPrice),
        baseUnitPrice: parseFloat(item.unitPrice), // Use unitPrice as base
        markupPrice: 0, // No markup data available
        markupBy: null,
        totalPrice: parseFloat(item.totalPrice)
      })) || [];

      return {
        id: saleData.id,
        customerName: saleData.customerName || null,
        customerPhone: saleData.customerPhone || null,
        customerEmail: saleData.customerEmail || null,
        subtotalAmount: parseFloat(saleData.subtotalAmount || saleData.totalAmount),
        total: parseFloat(saleData.totalAmount),
        discountType: saleData.discountType,
        discountValue: saleData.discountValue,
        paymentMethod: saleData.paymentMethod || 'cash',
        status: saleData.status || 'completed',
        createdAt: saleData.createdAt,
        saleDate: saleData.saleDate || saleData.createdAt,
        items: formattedItems,
        cashier: saleData.cashier ? {
          id: saleData.cashier.id,
          username: saleData.cashier.username,
          email: saleData.cashier.email
        } : null,
        location: saleData.location || 'Main Store',
        notes: saleData.notes || ''
      };
    });

    res.json(formattedSales);
  } catch (error) {
    console.error('Error searching orders:', error);
    res.status(500).json({ 
      error: 'Failed to search orders',
      details: error.message 
    });
  }
});

module.exports = router;