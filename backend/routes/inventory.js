const express = require('express');
const { Inventory, Product, Location, InventoryLog, User, ProductType } = require('../models');
const { sequelize } = require('../config/database');

const router = express.Router();

// GET /api/inventory - Get all inventory levels
router.get('/', async (req, res) => {
  try {
    const { locationId, category } = req.query;
    
    // Build where clause for location filtering - handle "all" case
    const whereClause = {};
    if (locationId && locationId !== 'all') {
      whereClause.locationId = parseInt(locationId);
    }
    
    // Build product include with category filtering
    const productWhereClause = {};
    if (category && category !== 'all') {
      // Since categories is a JSONB array, we need to check if the category exists in the array
      const { Op } = require('sequelize');
      productWhereClause.categories = { [Op.contains]: [category] };
    }
    
    const inventory = await Inventory.findAll({
      where: whereClause,
      include: [
        { 
          model: Product, 
          as: 'product',
          where: Object.keys(productWhereClause).length > 0 ? productWhereClause : undefined,
          required: Object.keys(productWhereClause).length > 0 // Required if filtering by category
        },
        { 
          model: Location, 
          as: 'location',
          required: false
        }
      ],
      order: [['updatedAt', 'DESC']]
    });

    // Filter out any null entries and add some debugging info
    const validInventory = inventory.filter(item => item && item.id);
    
    console.log(`Inventory query result: ${inventory.length} total, ${validInventory.length} valid items`);
    if (validInventory.length !== inventory.length) {
      console.log('Some inventory items were filtered out due to null values');
    }

    res.json({
      message: 'Inventory retrieved successfully',
      inventory: validInventory
    });

  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/inventory/log - Log inventory change
router.post('/log', async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { 
      productId, 
      locationId, 
      changeType, 
      changeAmount, 
      notes, 
      userId 
    } = req.body;

    if (!productId || !locationId || !changeType || !changeAmount || !userId) {
      await transaction.rollback();
      return res.status(400).json({ 
        message: 'Product ID, location ID, change type, change amount, and user ID are required' 
      });
    }

    // Find or create inventory record
    let inventory = await Inventory.findOne({
      where: { productId, locationId },
      transaction
    });

    const previousQuantity = inventory ? inventory.quantitySqm : 0;
    const newQuantity = parseFloat(previousQuantity) + parseFloat(changeAmount);

    if (newQuantity < 0) {
      await transaction.rollback();
      return res.status(400).json({ 
        message: 'Insufficient inventory. Cannot reduce below zero.' 
      });
    }

    // Update or create inventory record
    if (inventory) {
      await inventory.update({ quantitySqm: newQuantity }, { transaction });
    } else {
      inventory = await Inventory.create({
        productId,
        locationId,
        quantitySqm: newQuantity
      }, { transaction });
    }

    // Create inventory log entry
    const inventoryLog = await InventoryLog.create({
      productId,
      locationId,
      changeType,
      changeAmount,
      previousQuantity,
      newQuantity,
      notes,
      userId
    }, { transaction });

    await transaction.commit();

    // Return updated inventory with related data
    const updatedInventory = await Inventory.findByPk(inventory.id, {
      include: [
        { model: Product, as: 'product' },
        { model: Location, as: 'location' }
      ]
    });

    res.status(201).json({
      message: 'Inventory change logged successfully',
      inventory: updatedInventory,
      log: inventoryLog
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Inventory log error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/inventory/logs - Get inventory change history
router.get('/logs', async (req, res) => {
  try {
    const { productId, locationId, startDate, endDate, limit = 50 } = req.query;
    
    const whereClause = {};
    if (productId) whereClause.productId = productId;
    if (locationId) whereClause.locationId = locationId;
    
    // Add date range filtering
    if (startDate && endDate) {
      const { Op } = require('sequelize');
      const startDateTime = new Date(startDate + 'T00:00:00.000Z');
      const endDateTime = new Date(endDate + 'T23:59:59.999Z');
      whereClause.createdAt = {
        [Op.between]: [startDateTime, endDateTime]
      };
    }
    
    const logs = await InventoryLog.findAll({
      where: whereClause,
      include: [
        { model: Product, as: 'product' },
        { model: Location, as: 'location' },
        { model: User, as: 'user', attributes: ['firstName', 'lastName', 'email'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit)
    });

    res.json({
      message: 'Inventory logs retrieved successfully',
      logs
    });

  } catch (error) {
    console.error('Get inventory logs error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/inventory/low-stock - Get low stock items
router.get('/low-stock', async (req, res) => {
  try {
    const { locationId, threshold = 100 } = req.query;
    
    const whereClause = locationId ? { locationId } : {};
    whereClause.quantitySqm = { [require('sequelize').Op.lt]: threshold };
    
    const lowStockItems = await Inventory.findAll({
      where: whereClause,
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['name', 'attributes', 'productTypeId']
        },
        { model: Location, as: 'location' }
      ],
      order: [['quantitySqm', 'ASC']]
    });

    const formattedItems = lowStockItems.map(item => ({
      id: item.id,
      productName: item.product?.name || '(unknown)',
      attributes: (item.product && item.product.attributes) ? item.product.attributes : {},
      productTypeId: item.product?.productTypeId || null,
      quantitySqm: item.quantitySqm,
      location: item.location?.name || '(unknown)',
      productId: item.productId,
      locationId: item.locationId,
      Product: item.product ? {
        name: item.product.name,
        attributes: item.product.attributes || {},
        productTypeId: item.product.productTypeId
      } : undefined
    }));

    res.json({
      message: 'Low stock items retrieved successfully',
      items: formattedItems
    });

  } catch (error) {
    console.error('Get low stock items error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
