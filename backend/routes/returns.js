const express = require('express');
const router = express.Router();
const { Return, ReturnItem, Sale, SaleItem, Product, User, Location, sequelize } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { Op } = require('sequelize');
const { validate, toInteger, toNumber } = require('../middleware/validate');

const writeRoles = requireRole(['owner', 'manager']);

// Get all returns
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, locationId } = req.query;
    
    // Build where clause for date and location filtering
  const whereAnd = [];
    
    // Add date range filtering
    if (startDate && endDate) {
      const startDateTime = new Date(startDate + 'T00:00:00.000Z');
      const endDateTime = new Date(endDate + 'T23:59:59.999Z');
      whereAnd.push(require('../config/database').sequelize.where(
        require('../config/database').sequelize.col('created_at'),
        { [Op.between]: [startDateTime, endDateTime] }
      ));
    }
    
    const returns = await Return.findAll({
      where: whereAnd.length ? { [Op.and]: whereAnd } : {},
      include: [
        {
          model: ReturnItem,
          as: 'items',
          include: [
            { model: Product },
            { model: Location }
          ]
        },
        { 
          model: User,
          as: 'processor',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      order: [['created_at', 'DESC']]
    });
    res.json({ returns });
  } catch (error) {
    console.error('Error fetching returns:', error);
    console.error('Error stack:', error.stack);
    console.error('Query parameters:', { startDate, endDate, locationId });
    res.status(500).json({
      error: 'Failed to fetch returns',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get return by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const returnRecord = await Return.findByPk(req.params.id, {
      include: [
        {
          model: ReturnItem,
          as: 'items',
          include: [
            { model: Product },
            { model: Location }
          ]
        },
        { 
          model: User,
          as: 'processor',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });
    
    if (!returnRecord) {
      return res.status(404).json({ error: 'Return not found' });
    }
    
    res.json({ return: returnRecord });
  } catch (error) {
    console.error('Error fetching return:', error);
    res.status(500).json({ error: 'Failed to fetch return details' });
  }
});

// Create a new return
router.post('/', authenticateToken, validate([
  { in: 'body', field: 'saleId', required: true, type: 'integer', min: 1 },
  { in: 'body', field: 'items', required: true, type: 'array' },
  { in: 'body', field: 'reason', required: false, type: 'string', trim: true, maxLen: 2000 },
  { in: 'body', field: 'refundMethod', required: false, type: 'string', trim: true, maxLen: 64 },
  { in: 'body', field: 'notes', required: false, type: 'string', trim: true, maxLen: 20000 },
]), async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const saleId = req.body.saleId;
    const reason = req.body.reason;
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    const refundMethod = req.body.refundMethod;
    const notes = req.body.notes;

    const returnTypeRaw = typeof req.body.returnType === 'string'
      ? req.body.returnType
      : (typeof req.body.type === 'string' ? req.body.type : '');

    // Convert returnType to uppercase to match stored values
    const normalizedReturnType = String(returnTypeRaw).trim().toUpperCase();
    const normalizedRefundMethod = refundMethod ? String(refundMethod).trim().toUpperCase() : null;
    
    if (!['REFUND', 'EXCHANGE'].includes(normalizedReturnType)) {
      await t.rollback();
      return res.status(400).json({ error: 'Invalid return type. Must be REFUND or EXCHANGE.' });
    }

    if (items.length === 0) {
      await t.rollback();
      return res.status(400).json({ error: 'At least one return item is required' });
    }

    // Validate the sale exists
    const sale = await Sale.findByPk(saleId);
    if (!sale) {
      await t.rollback();
      return res.status(404).json({ error: 'Sale not found' });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('Found sale:', { id: sale.id, locationId: sale.locationId });
    }

    // Create the return record
    const returnRecord = await Return.create({
      saleId,
      processedById: req.user.id,
      returnType: normalizedReturnType,
      reason,
      refundMethod: normalizedRefundMethod,
      notes,
      status: 'PENDING'
    }, { transaction: t });

    // Process each return item
    let totalRefundAmount = 0;
    const returnItems = [];

    for (const item of items) {
      const saleItemId = toInteger(item?.saleItemId);
      const quantity = toNumber(item?.quantity);
      if (!saleItemId || !quantity || quantity <= 0) {
        await t.rollback();
        return res.status(400).json({ error: 'Invalid return item. saleItemId and quantity are required.' });
      }

      const saleItem = await SaleItem.findByPk(saleItemId);
      if (!saleItem) {
        await t.rollback();
        return res.status(404).json({ error: `Sale item not found: ${saleItemId}` });
      }

      // Validate return quantity
      if (quantity > saleItem.quantity) {
        await t.rollback();
        return res.status(400).json({ 
          error: `Cannot return more items than purchased. Requested: ${quantity}, Purchased: ${saleItem.quantity}`
        });
      }

      // Calculate refund amount
      const refundAmount = (quantity / saleItem.quantity) * saleItem.unitPrice;
      totalRefundAmount += refundAmount;

      // Create return item
      const returnItem = await ReturnItem.create({
        returnId: returnRecord.id,
        saleItemId: saleItem.id,
        productId: saleItem.productId,
        locationId: sale.locationId, // Use the location from the sale
        quantity,
        returnReason: item.returnReason,
        condition: item.condition?.toUpperCase() || 'PERFECT',
        refundAmount,
        exchangeProductId: item.exchangeProductId
      }, { transaction: t });

      // If it's not an exchange, return items to inventory
      if (normalizedReturnType === 'REFUND') {
        await sequelize.query(
          `UPDATE "inventory" 
           SET "quantitySqm" = "quantitySqm" + :quantity 
           WHERE "productId" = :productId AND "locationId" = :locationId`,
          {
            replacements: {
              quantity,
              productId: saleItem.productId,
              locationId: sale.locationId // Use the location from the sale
            },
            transaction: t
          }
        );
      }

      returnItems.push(returnItem);
    }

    // Update the total refund amount
    await returnRecord.update({
      totalRefundAmount
    }, { transaction: t });

    // Commit the transaction before fetching the complete record
    await t.commit();

    // Fetch the complete return record with associations (outside transaction)
    const completeReturn = await Return.findByPk(returnRecord.id, {
      include: [
        {
          model: ReturnItem,
          as: 'items',
          include: [
            { model: Product },
            { model: Location }
          ]
        },
        { 
          model: User,
          as: 'processor',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ Return processed successfully:', returnRecord.id);
    }
    res.status(201).json({ return: completeReturn });
  } catch (error) {
    // Only rollback if transaction is still pending
    if (t && !t.finished) {
      await t.rollback();
    }
    console.error('Error processing return:', error);
    res.status(500).json({ error: 'Failed to process return' });
  }
});

// Update return status
router.patch('/:id/status', authenticateToken, writeRoles, validate([
  { in: 'params', field: 'id', required: true, type: 'integer', min: 1 },
  { in: 'body', field: 'status', required: true, type: 'string', trim: true, oneOf: ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'] },
]), async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { status } = req.body;
    const returnRecord = await Return.findByPk(req.params.id, {
      include: [{ model: ReturnItem, as: 'items' }]
    });

    if (!returnRecord) {
      await t.rollback();
      return res.status(404).json({ error: 'Return not found' });
    }

    // Update status
    await returnRecord.update({ status }, { transaction: t });

    // If approving or rejecting, handle inventory
    if (status === 'REJECTED' && returnRecord.returnType === 'REFUND') {
      // If rejecting a refund, remove items from inventory
      for (const item of returnRecord.items) {
        await sequelize.query(
          `UPDATE "inventory" 
           SET "quantitySqm" = "quantitySqm" - :quantity 
           WHERE "productId" = :productId AND "locationId" = :locationId`,
          {
            replacements: {
              quantity: item.quantity,
              productId: item.productId,
              locationId: item.locationId
            },
            transaction: t
          }
        );
      }
    }

    await t.commit();
    res.json({ return: returnRecord });
  } catch (error) {
    await t.rollback();
    console.error('Error updating return status:', error);
    res.status(500).json({ error: 'Failed to update return status' });
  }
});

module.exports = router;
