const express = require('express');
const { Location, User, Inventory, Product } = require('../models');

const router = express.Router();

// GET /api/locations - Get all locations
router.get('/', async (req, res) => {
  try {
    const locations = await Location.findAll({
      include: [
        { 
          model: User, 
          as: 'users', 
          attributes: ['id', 'firstName', 'lastName', 'email', 'role'] 
        }
      ],
      order: [['createdAt', 'ASC']]
    });

    res.json({
      message: 'Locations retrieved successfully',
      locations
    });

  } catch (error) {
    console.error('Get locations error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/locations/:id - Get single location with inventory
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const location = await Location.findByPk(id, {
      include: [
        { 
          model: User, 
          as: 'users', 
          attributes: ['id', 'firstName', 'lastName', 'email', 'role'] 
        },
        {
          model: Inventory,
          as: 'inventory',
          include: [{ model: Product, as: 'product' }]
        }
      ]
    });
    
    if (!location) {
      return res.status(404).json({ message: 'Location not found' });
    }

    res.json({
      message: 'Location retrieved successfully',
      location
    });

  } catch (error) {
    console.error('Get location error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/locations - Create new location
router.post('/', async (req, res) => {
  try {
    const { name, address } = req.body;

    if (!name || !address) {
      return res.status(400).json({ 
        message: 'Name and address are required' 
      });
    }

    const newLocation = await Location.create({
      name,
      address
    });

    res.status(201).json({
      message: 'Location created successfully',
      location: newLocation
    });

  } catch (error) {
    console.error('Create location error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/locations/:id - Update location
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address } = req.body;

    const location = await Location.findByPk(id);
    
    if (!location) {
      return res.status(404).json({ message: 'Location not found' });
    }

    await location.update({
      name: name || location.name,
      address: address || location.address
    });

    res.json({
      message: 'Location updated successfully',
      location
    });

  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /api/locations/:id - Delete location
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const location = await Location.findByPk(id, {
      include: [{ model: Inventory, as: 'inventory' }]
    });
    
    if (!location) {
      return res.status(404).json({ message: 'Location not found' });
    }

    // Check if location has inventory with actual products (quantity > 0)
    const hasActualInventory = location.inventory && location.inventory.some(item => 
      parseFloat(item.quantitySqm) > 0
    );

    if (hasActualInventory) {
      return res.status(400).json({ 
        message: 'Cannot delete location that contains products. Please move or remove all products first.'
      });
    }

    // If there are empty inventory records (quantity = 0), delete them first
    if (location.inventory && location.inventory.length > 0) {
      await Inventory.destroy({
        where: {
          locationId: id,
          quantitySqm: 0
        }
      });
    }

    await location.destroy();
    res.json({ message: 'Location deleted successfully' });

  } catch (error) {
    console.error('Delete location error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
