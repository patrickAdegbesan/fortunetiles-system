const express = require('express');
const { Sale, SaleItem, Product, Location, User, Inventory, InventoryLog } = require('../models');
const { sequelize } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/sales - Get all sales with optimized queries
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { locationId, limit = 50, offset = 0, startDate, endDate } = req.query;
    
    // Build optimized where clause
    const whereClause = {};
    if (locationId) whereClause.locationId = locationId;
    if (startDate && endDate) {
      whereClause[sequelize.Op.and] = [
        sequelize.where(sequelize.col('created_at'), {
          [sequelize.Op.between]: [new Date(startDate), new Date(endDate)]
        })
      ];
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
          attributes: ['id', 'quantity', 'unitPrice', 'lineTotal', 'baseUnitPrice', 'markupPrice', 'markupBy'],
          include: [{ 
            model: Product, 
            as: 'product',
            attributes: ['id', 'name', 'unitOfMeasure'] // Only fetch essential fields
          }]
        }
      ],
  order: [['created_at', 'DESC']],
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

// GET /api/sales/:id - Get single sale
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const sale = await Sale.findByPk(id, {
      include: [
        { model: Location, as: 'location' },
        { model: User, as: 'cashier', attributes: ['firstName', 'lastName', 'email'] },
        { 
          model: SaleItem, 
          as: 'items',
          include: [{ model: Product, as: 'product' }]
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

// POST /api/sales - Create new sale with items
router.post('/', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Debug logging
    console.log('Headers:', req.headers);
    console.log('Raw body:', req.body);
    console.log('Received sale request:', JSON.stringify(req.body, null, 2));
    
    const { customerName, customerPhone, discountType, discountValue, subtotalAmount } = req.body;
    // Accept string or number for locationId, coerce to number if possible
    const locationIdRaw = req.body.locationId;
    const locationId = locationIdRaw ? (Number.isFinite(Number(locationIdRaw)) ? Number(locationIdRaw) : parseInt(locationIdRaw, 10)) : null;
    // Prefer authenticated user, fallback to body for backward compatibility
    let userId = req.user?.id || req.body.userId;
    
    // If still no userId, try to find first active user (fallback for development)
    if (!userId && process.env.NODE_ENV === 'development') {
      const firstUser = await User.findOne({ where: { isActive: true } });
      userId = firstUser?.id;
    }
    
    const itemsInput = Array.isArray(req.body.items) ? req.body.items : [];

    // Log parsed values for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('Parsed sale values:', {
        customerName,
        customerPhone,
        locationId,
        userId,
        itemsCount: itemsInput.length
      });
    }

    // Validate required fields
    const errors = [];
    if (!customerName) errors.push({ field: 'customerName', message: 'Customer name is required' });
    if (!locationId) errors.push({ field: 'locationId', message: 'Location ID is required' });
    if (!userId) errors.push({ field: 'userId', message: 'User ID is required' });
    if (!itemsInput || !Array.isArray(itemsInput)) {
      errors.push({ field: 'items', message: 'Items must be an array' });
    } else if (itemsInput.length === 0) {
      errors.push({ field: 'items', message: 'At least one item is required' });
    }

    // Log validation results in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Initial validation results:', { errors, customerName, locationId, userId, itemsCount: itemsInput?.length });
      console.log('req.user:', req.user);
    }

    if (errors.length > 0) {
      await transaction.rollback();
      return res.status(400).json({
        message: 'Validation failed',
        errors,
        debug: { customerName, locationId, userId, itemsCount: itemsInput?.length }
      });
    }

    // Validate items and calculate subtotal amount
    let calculatedSubtotal = 0;
    const itemErrors = [];

    // Normalize items to ensure unitPrice is present (fallback to price)
    const normalizedItems = itemsInput.map(it => ({
      ...it,
      unitPrice: it.unitPrice !== undefined && it.unitPrice !== null ? it.unitPrice : it.price,
      markupPrice: it.markupPrice || 0
    }));

    for (let i = 0; i < normalizedItems.length; i++) {
      const item = normalizedItems[i];
      console.log(`Validating item ${i}:`, JSON.stringify(item, null, 2));

      // Validate required fields
      if (!item.productId) {
        itemErrors.push({ field: `items[${i}].productId`, message: 'Product ID is required' });
      }
      if (!item.quantity) {
        itemErrors.push({ field: `items[${i}].quantity`, message: 'Quantity is required' });
      }
      if (!item.unitPrice) {
        itemErrors.push({ field: `items[${i}].unitPrice`, message: 'Unit price is required' });
      }

      if (item.productId && item.quantity && item.unitPrice) {
        // Frontend already calculated subtotal with markup included
        // Just validate the items exist and have quantities
        // Don't recalculate here - use frontend's subtotalAmount
      }
    }

    // Use provided subtotalAmount or calculated one
    const subtotal = subtotalAmount ? parseFloat(subtotalAmount) : calculatedSubtotal;

    // Calculate discount amount
    let discountAmount = 0;
    if (discountType && discountValue) {
      const value = parseFloat(discountValue);
      if (discountType === 'percentage') {
        discountAmount = (subtotal * value) / 100;
      } else if (discountType === 'amount') {
        discountAmount = Math.min(value, subtotal); // Don't allow discount > subtotal
      }
    }

    // Calculate final total amount
    const totalAmount = subtotal - discountAmount;

    if (itemErrors.length > 0) {
      await transaction.rollback();
      return res.status(400).json({
        message: 'Item validation failed',
        errors: itemErrors
      });
    }

    // Create sale
    const sale = await Sale.create({
      customerName,
      customerPhone,
      subtotalAmount: subtotal,
      discountType: discountType || null,
      discountValue: discountValue ? parseFloat(discountValue) : 0,
      totalAmount,
      locationId,
      userId,
      paymentMethod: req.body.paymentMethod || 'cash'
    }, { transaction });

    // Create sale items and update inventory
    const saleItems = [];
    for (const item of normalizedItems) {
      console.log('Processing item:', item);
      
      // Get product to verify the unit
      const product = await Product.findByPk(item.productId, {
        transaction
      });

      console.log('Found product:', product?.toJSON());

      if (!product) {
        await transaction.rollback();
        return res.status(400).json({
          message: 'Validation failed',
          errors: [{ field: 'productId', message: `Product with ID ${item.productId} not found` }]
        });
      }

      const lineTotal = parseFloat(item.quantity) * parseFloat(item.unitPrice);
      
      // Check inventory first
      const inventory = await Inventory.findOne({
        where: { productId: item.productId, locationId },
        transaction
      });

      const requestedQuantity = parseFloat(item.quantity);
      const availableQuantity = inventory ? inventory.quantitySqm : 0;

      if (!inventory) {
        await transaction.rollback();
        return res.status(400).json({
          message: 'Validation failed',
          errors: [{ 
            field: `items[${i}].productId`, 
            message: `No inventory found for product ${product.name} at selected location`
          }]
        });
      }

      // Convert quantities to numbers for accurate comparison
      const requestedQty = parseFloat(item.quantity);
      const availableQty = parseFloat(inventory.quantitySqm);

      if (availableQty < requestedQty) {
        await transaction.rollback();
        return res.status(400).json({
          message: 'Validation failed',
          errors: [{ 
            field: `items[${i}].quantity`, 
            message: `Insufficient inventory for product ${product.name}. Available: ${availableQty}, Requested: ${requestedQty}`
          }]
        });
      }

      try {
        // Calculate line total
        const baseUnitPrice = parseFloat(item.unitPrice);
        const markupPrice = parseFloat(item.markupPrice) || 0;
        const finalUnitPrice = baseUnitPrice + markupPrice;
        const lineTotal = requestedQty * finalUnitPrice;

        // Create sale item with markup tracking
        const saleItem = await SaleItem.create({
          saleId: sale.id,
          productId: item.productId,
          quantity: requestedQty,
          unit: product.unitOfMeasure,
          unitPrice: finalUnitPrice,
          lineTotal,
          baseUnitPrice: baseUnitPrice,
          markupPrice: markupPrice,
          markupBy: markupPrice > 0 ? req.user?.id : null
        }, { transaction });

        console.log('Created sale item:', JSON.stringify(saleItem.toJSON(), null, 2));
        saleItems.push(saleItem);

        // Update inventory
        const previousQuantity = parseFloat(inventory.quantitySqm);
        const newQuantity = previousQuantity - requestedQty;
        
        console.log('Updating inventory:', {
          productId: item.productId,
          previousQuantity,
          requestedQty,
          newQuantity
        });
        
        await inventory.update({ quantitySqm: newQuantity }, { transaction });

        // Log inventory change
        await InventoryLog.create({
          productId: item.productId,
          locationId,
          changeType: 'sale',
          changeAmount: -requestedQty,
          previousQuantity,
          newQuantity,
          notes: `Sale to ${customerName}`,
          userId
        }, { transaction });
        
        console.log('Created inventory log for product:', item.productId);

      } catch (error) {
        console.error('Sale item creation error:', error);
        await transaction.rollback();
        return res.status(400).json({
          message: 'Validation failed',
          errors: error.errors?.map(err => ({
            field: err.path,
            message: err.message
          })) || [{ message: error.message }]
        });
      }
    }

    await transaction.commit();

    // Return sale with items
    try {
      const completeSale = await Sale.findByPk(sale.id, {
        include: [
          { model: Location, as: 'location' },
          { model: User, as: 'cashier', attributes: ['firstName', 'lastName', 'email'] },
          { 
            model: SaleItem, 
            as: 'items',
            include: [{ model: Product, as: 'product' }]
          }
        ]
      });

      res.status(201).json({
        message: 'Sale created successfully',
        sale: completeSale
      });
    } catch (queryError) {
      console.error('Error fetching complete sale after commit:', queryError);
      // Sale was created successfully, just return basic info
      res.status(201).json({
        message: 'Sale created successfully',
        sale: {
          id: sale.id,
          saleNumber: sale.saleNumber,
          totalAmount: sale.totalAmount,
          paymentMethod: sale.paymentMethod,
          customerName: sale.customerName
        }
      });
    }

  } catch (error) {
    // Only rollback if transaction hasn't been committed
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error('Create sale error:', error);
    
    // Send more detailed error messages for validation errors
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
      error: process.env.NODE_ENV !== 'production' ? error : undefined
    });
  }
});

module.exports = router;
