const express = require('express');
const { Inventory, Product, Location, InventoryLog, User, ProductType } = require('../models');
const { sequelize } = require('../config/database');

const router = express.Router();

// GET /api/inventory - Get all inventory levels
router.get('/', async (req, res) => {
  try {
    const { locationId } = req.query;
    
    const whereClause = locationId ? { locationId: parseInt(locationId) } : {};
    
    const inventory = await Inventory.findAll({
      where: whereClause,
      include: [
        { 
          model: Product, 
          as: 'product'
        },
        { 
          model: Location, 
          as: 'location' 
        }
      ],
      order: [['updatedAt', 'DESC']]
    });

    res.json({
      message: 'Inventory retrieved successfully',
      inventory
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
    const { productId, locationId, limit = 50 } = req.query;
    
    const whereClause = {};
    if (productId) whereClause.productId = productId;
    if (locationId) whereClause.locationId = locationId;
    
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
          attributes: ['name', 'customAttributes', 'productTypeId']
        },
        { model: Location, as: 'location' }
      ],
      order: [['quantitySqm', 'ASC']]
    });

    const formattedItems = lowStockItems.map(item => ({
      id: item.id,
      productName: item.product.name,
      customAttributes: item.product.customAttributes || {},
      productTypeId: item.product.productTypeId,
      quantitySqm: item.quantitySqm,
      location: item.location.name,
      productId: item.productId,
      locationId: item.locationId,
      Product: {
        name: item.product.name,
        customAttributes: item.product.customAttributes || {},
        productTypeId: item.product.productTypeId
      }
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
