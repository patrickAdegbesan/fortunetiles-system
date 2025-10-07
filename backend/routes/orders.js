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
    const whereClause = {};
    
    // Add date range filtering
    if (startDate && endDate) {
      const startDateTime = new Date(startDate + 'T00:00:00.000Z');
      const endDateTime = new Date(endDate + 'T23:59:59.999Z');
      whereClause.createdAt = {
        [Op.between]: [startDateTime, endDateTime]
      };
    }
    
    // Add location filtering
    if (locationId && locationId !== 'all') {
      whereClause.locationId = parseInt(locationId);
    }
    
    const sales = await Sale.findAll({
      where: whereClause,
      include: [
        {
          model: SaleItem,
          as: 'items',
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
        },
        {
          model: Return,
          as: 'returns',
          required: false, // Left join to include sales without returns
          attributes: ['id', 'returnType', 'status', 'totalRefundAmount', 'createdAt']
        }
        // Temporarily removed Location association to debug
        // {
        //   model: Location,
        //   as: 'location',
        //   attributes: ['id', 'name', 'address']
        // }
      ],
      order: [['createdAt', 'DESC']],
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
        unit: item.unit || 'sqm',
        unitPrice: parseFloat(item.unitPrice),
        totalPrice: parseFloat(item.lineTotal) // Map lineTotal to totalPrice
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
        status: saleData.returns && saleData.returns.length > 0 ? 'partially_returned' : 'completed',
        createdAt: saleData.createdAt,
        saleDate: saleData.createdAt, // Use createdAt as saleDate
        items: formattedItems,
        cashier: saleData.cashier ? {
          id: saleData.cashier.id,
          name: `${saleData.cashier.firstName} ${saleData.cashier.lastName}`,
          email: saleData.cashier.email
        } : null,
        location: 'Main Store', // Hardcoded since location association is temporarily removed
        notes: saleData.notes || '',
        returns: saleData.returns || []
      };
    });

    res.json(formattedSales);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ 
      error: 'Failed to fetch orders',
      details: error.message 
    });
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
      unit: item.unit || 'sqm',
      unitPrice: parseFloat(item.unitPrice),
      totalPrice: parseFloat(item.lineTotal) // Map lineTotal to totalPrice
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
      order: [['createdAt', 'DESC']],
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
        unit: item.unit || 'sqm',
        unitPrice: parseFloat(item.unitPrice),
        totalPrice: parseFloat(item.lineTotal) // Map lineTotal to totalPrice
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