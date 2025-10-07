const express = require('express');
const { Sale, SaleItem, Product, Location, User, Inventory, InventoryLog } = require('../models');
const { sequelize } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/sales - Get all sales with optimized queries
router.get('/', async (req, res) => {
  try {
    const { locationId, limit = 50, offset = 0, startDate, endDate } = req.query;
    
    // Build optimized where clause
    const whereClause = {};
    if (locationId) whereClause.locationId = locationId;
    if (startDate && endDate) {
      whereClause.createdAt = {
        [sequelize.Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }
    
    const sales = await Sale.findAndCountAll({
      where: whereClause,
      include: [
        { 
          model: Location, 
          as: 'location',
          attributes: ['id', 'name'] // Only fetch needed fields
        },
        { 
          model: User, 
          as: 'cashier', 
          attributes: ['id', 'firstName', 'lastName', 'email'] 
        },
        { 
          model: SaleItem, 
          as: 'items',
          attributes: ['id', 'quantity', 'unitPrice', 'lineTotal'],
          include: [{ 
            model: Product, 
            as: 'product',
            attributes: ['id', 'name', 'unitOfMeasure'] // Only fetch essential fields
          }]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      // Add database-level optimization
      subQuery: false
    });

    res.json({
      message: 'Sales retrieved successfully',
      sales: sales.rows,
      pagination: {
        total: sales.count,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < sales.count
      }
    });

  } catch (error) {
    console.error('Get sales error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/sales/:id - Get single sale with optimized includes
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const sale = await Sale.findByPk(id, {
      include: [
        { 
          model: Location, 
          as: 'location',
          attributes: ['id', 'name']
        },
        { 
          model: User, 
          as: 'cashier', 
          attributes: ['id', 'firstName', 'lastName', 'email'] 
        },
        { 
          model: SaleItem, 
          as: 'items',
          attributes: ['id', 'quantity', 'unitPrice', 'lineTotal'],
          include: [{ 
            model: Product, 
            as: 'product',
            attributes: ['id', 'name', 'unitOfMeasure']
          }]
        }
      ]
    });
    
    if (!sale) {
      return res.status(404).json({ message: 'Sale not found' });
    }

    res.json({
      message: 'Sale retrieved successfully',
      sale
    });

  } catch (error) {
    console.error('Get sale error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/sales - Create new sale with optimized transaction handling
router.post('/', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction({
    isolationLevel: sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED
  });
  
  try {
    const { customerName, customerPhone } = req.body;
    const locationIdRaw = req.body.locationId;
    const locationId = Number.isFinite(locationIdRaw) ? locationIdRaw : parseInt(locationIdRaw, 10);
    const userId = req.user?.id || req.body.userId;
    const itemsInput = Array.isArray(req.body.items) ? req.body.items : [];
    
    // Early validation
    const errors = [];
    if (!customerName) errors.push({ field: 'customerName', message: 'Customer name is required' });
    if (!locationId) errors.push({ field: 'locationId', message: 'Location ID is required' });
    if (!userId) errors.push({ field: 'userId', message: 'User ID is required' });
    if (!itemsInput || !Array.isArray(itemsInput) || itemsInput.length === 0) {
      errors.push({ field: 'items', message: 'At least one item is required' });
    }

    if (errors.length > 0) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    // Normalize and validate items
    const normalizedItems = itemsInput.map(item => ({
      ...item,
      unitPrice: item.unitPrice !== undefined && item.unitPrice !== null ? item.unitPrice : item.price,
      quantity: parseFloat(item.quantity),
      productId: parseInt(item.productId, 10)
    }));

    // Validate item structure
    const itemErrors = [];
    let totalAmount = 0;
    
    for (let i = 0; i < normalizedItems.length; i++) {
      const item = normalizedItems[i];
      
      if (!item.productId || isNaN(item.productId)) {
        itemErrors.push({ field: `items[${i}].productId`, message: 'Valid product ID is required' });
      }
      if (!item.quantity || item.quantity <= 0) {
        itemErrors.push({ field: `items[${i}].quantity`, message: 'Valid quantity is required' });
      }
      if (!item.unitPrice || item.unitPrice <= 0) {
        itemErrors.push({ field: `items[${i}].unitPrice`, message: 'Valid unit price is required' });
      }

      if (item.productId && item.quantity && item.unitPrice) {
        totalAmount += item.quantity * parseFloat(item.unitPrice);
      }
    }

    if (itemErrors.length > 0) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Item validation failed', errors: itemErrors });
    }

    // Batch check inventory availability with locking
    const productIds = normalizedItems.map(item => item.productId);
    const inventoryRecords = await Inventory.findAll({
      where: {
        productId: { [sequelize.Op.in]: productIds },
        locationId
      },
      include: [{
        model: Product,
        as: 'product'
      }],
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    const inventoryMap = new Map(inventoryRecords.map(inv => [inv.productId, inv]));
    const productMap = new Map(inventoryRecords.map(inv => [inv.productId, inv.product]));

    // Validate inventory availability
    for (let i = 0; i < normalizedItems.length; i++) {
      const item = normalizedItems[i];
      const inventory = inventoryMap.get(item.productId);
      const product = productMap.get(item.productId);

      if (!inventory || !product) {
        await transaction.rollback();
        return res.status(400).json({
          message: 'Validation failed',
          errors: [{ 
            field: `items[${i}].productId`, 
            message: `Product or inventory not found for product ID ${item.productId}`
          }]
        });
      }

      const availableQuantity = parseFloat(inventory.quantitySqm || 0);
      if (availableQuantity < item.quantity) {
        await transaction.rollback();
        return res.status(400).json({
          message: 'Validation failed',
          errors: [{ 
            field: `items[${i}].quantity`, 
            message: `Insufficient inventory for ${product.name}. Available: ${availableQuantity}, Requested: ${item.quantity}`
          }]
        });
      }
    }

    // Create sale
    const sale = await Sale.create({
      customerName,
      customerPhone,
      totalAmount,
      locationId,
      userId,
      paymentMethod: req.body.paymentMethod || 'cash'
    }, { transaction });

    // Prepare bulk operations
    const saleItemsToCreate = [];
    const inventoryUpdates = [];
    const inventoryLogs = [];

    for (const item of normalizedItems) {
      const inventory = inventoryMap.get(item.productId);
      const product = productMap.get(item.productId);
      const lineTotal = item.quantity * parseFloat(item.unitPrice);
      const previousQuantity = parseFloat(inventory.quantitySqm);
      const newQuantity = previousQuantity - item.quantity;
      
      saleItemsToCreate.push({
        saleId: sale.id,
        productId: item.productId,
        quantity: item.quantity,
        unit: product.unitOfMeasure,
        unitPrice: parseFloat(item.unitPrice),
        lineTotal
      });

      inventoryUpdates.push({
        id: inventory.id,
        quantitySqm: newQuantity
      });

      inventoryLogs.push({
        productId: item.productId,
        locationId,
        changeType: 'sale',
        changeAmount: -item.quantity,
        previousQuantity,
        newQuantity,
        notes: `Sale to ${customerName}`,
        userId
      });
    }

    // Execute bulk operations
    await Promise.all([
      SaleItem.bulkCreate(saleItemsToCreate, { transaction }),
      ...inventoryUpdates.map(update => 
        Inventory.update(
          { quantitySqm: update.quantitySqm },
          { where: { id: update.id }, transaction }
        )
      ),
      InventoryLog.bulkCreate(inventoryLogs, { transaction })
    ]);

    await transaction.commit();

    // Return optimized response
    res.status(201).json({
      message: 'Sale created successfully',
      sale: {
        id: sale.id,
        saleNumber: sale.saleNumber,
        totalAmount: sale.totalAmount,
        paymentMethod: sale.paymentMethod,
        customerName: sale.customerName,
        createdAt: sale.createdAt
      }
    });

  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    
    console.error('Create sale error:', error);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        message: 'Validation error',
        errors: error.errors.map(err => ({
          field: err.path,
          message: err.message
        }))
      });
    }
    
    res.status(500).json({ 
      message: error.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

module.exports = router;