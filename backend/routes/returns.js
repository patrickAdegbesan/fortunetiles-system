const express = require('express');
const router = express.Router();
const { Return, ReturnItem, Sale, SaleItem, Product, User, Location, sequelize } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { Op } = require('sequelize');

// Get all returns
router.get('/', authenticateToken, async (req, res) => {
  try {
    const returns = await Return.findAll({
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
      order: [['createdAt', 'DESC']]
    });
    res.json({ returns });
  } catch (error) {
    console.error('Error fetching returns:', error);
    res.status(500).json({ error: 'Failed to fetch returns' });
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
router.post('/', authenticateToken, async (req, res) => {
  console.log('====== RETURNS POST ROUTE ENTRY ======');
  console.log('🚨 RETURNS ROUTE HIT - POST /');
  console.log('Request body:', req.body);
  console.log('User from auth:', req.user);
  
  const t = await sequelize.transaction();
  
  try {
    const {
      saleId,
      type: returnType,
      reason,
      items,
      refundMethod,
      notes
    } = req.body;

    // Convert returnType to uppercase to match ENUM values
    const normalizedReturnType = returnType?.toUpperCase();
    const normalizedRefundMethod = refundMethod?.toUpperCase();
    
    console.log('Return request data:', { saleId, returnType, normalizedReturnType, refundMethod, normalizedRefundMethod, reason, userId: req.user?.id });

    // Validate the sale exists
    const sale = await Sale.findByPk(saleId);
    if (!sale) {
      await t.rollback();
      return res.status(404).json({ error: 'Sale not found' });
    }

    console.log('Found sale:', { id: sale.id, locationId: sale.locationId });

    // Create the return record
    const returnRecord = await Return.create({
      saleId,
      processedBy: req.user.id,
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
      const saleItem = await SaleItem.findByPk(item.saleItemId);
      if (!saleItem) {
        await t.rollback();
        return res.status(404).json({ error: `Sale item not found: ${item.saleItemId}` });
      }

      // Validate return quantity
      if (item.quantity > saleItem.quantity) {
        await t.rollback();
        return res.status(400).json({ 
          error: `Cannot return more items than purchased. Requested: ${item.quantity}, Purchased: ${saleItem.quantity}`
        });
      }

      // Calculate refund amount
      const refundAmount = (item.quantity / saleItem.quantity) * saleItem.unitPrice;
      totalRefundAmount += refundAmount;

      // Create return item
      const returnItem = await ReturnItem.create({
        returnId: returnRecord.id,
        saleItemId: saleItem.id,
        productId: saleItem.productId,
        locationId: sale.locationId, // Use the location from the sale
        quantity: item.quantity,
        returnReason: item.returnReason,
        condition: item.condition?.toUpperCase() || 'PERFECT',
        refundAmount,
        exchangeProductId: item.exchangeProductId
      }, { transaction: t });

      // If it's not an exchange, return items to inventory
      if (returnType === 'REFUND') {
        await sequelize.query(
          `UPDATE "Inventory" 
           SET "quantitySqm" = "quantitySqm" + :quantity 
           WHERE "productId" = :productId AND "locationId" = :locationId`,
          {
            replacements: {
              quantity: item.quantity,
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

    console.log('✅ Return processed successfully:', returnRecord.id);
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
router.patch('/:id/status', authenticateToken, async (req, res) => {
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
          `UPDATE "Inventory" 
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
