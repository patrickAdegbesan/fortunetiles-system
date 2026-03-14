const express = require('express');
const { Location, User, Inventory, Product } = require('../models');
const cache = require('../middleware/enhancedCache');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();
const writeRoles = requireRole(['owner', 'manager']);

// Require authentication for all location routes
router.use(authenticateToken);

// GET /api/locations - Get all locations (smart cached)
router.get('/', async (req, res) => {
  try {
    // Set cache headers for client-side caching
    res.set('Cache-Control', 'public, max-age=300'); // 5 minutes client cache
    res.set('ETag', `"locations-v1"`);

    if (process.env.NODE_ENV !== 'production') {
      console.log('Fetching locations, checking cache...');
    }

    const locations = await cache.getOrSetSmart('locations:all', async () => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Cache miss, fetching from database...');
      }
      return await Location.findAll({
        attributes: ['id', 'name', 'created_at'], // Use snake_case as defined in model
        include: [
          {
            model: User,
            as: 'users',
            attributes: ['id', 'firstName', 'lastName', 'email', 'role']
          }
        ],
        order: [['created_at', 'ASC']]  // Use snake_case
      });
    }, 600000); // Base 10 minutes (enhanced cache will extend to 20 minutes)

    if (process.env.NODE_ENV !== 'production') {
      console.log('Locations fetched, count:', locations.length);
    }

    res.json({
      message: 'Locations retrieved successfully',
      locations,
      cached: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get locations error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/locations/:id - Get single location with inventory
router.get('/:id', validate([
  { in: 'params', field: 'id', required: true, type: 'integer', min: 1 },
]), async (req, res) => {
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
router.post('/', writeRoles, validate([
  { in: 'body', field: 'name', required: true, type: 'string', trim: true, maxLen: 255, minLen: 1 },
  { in: 'body', field: 'address', required: true, type: 'string', trim: true, maxLen: 1000, minLen: 1 },
]), async (req, res) => {
  try {
    const { name, address } = req.body;

    if (process.env.NODE_ENV !== 'production') {
      console.log('Creating location:', { name });
    }

    // Check if location with this name already exists
    const existingLocation = await Location.findOne({ where: { name } });
    if (existingLocation) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Location with name already exists:', existingLocation.id);
      }
      return res.status(400).json({
        message: 'Location with this name already exists'
      });
    }

    const newLocation = await Location.create({
      name,
      address
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log('Location created successfully with id:', newLocation.id);
    }

    // Invalidate cache to ensure fresh data on next fetch
    cache.delete('locations:all');

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
router.put('/:id', writeRoles, validate([
  { in: 'params', field: 'id', required: true, type: 'integer', min: 1 },
  { in: 'body', field: 'name', required: false, type: 'string', trim: true, maxLen: 255 },
  { in: 'body', field: 'address', required: false, type: 'string', trim: true, maxLen: 1000 },
]), async (req, res) => {
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
router.delete('/:id', writeRoles, validate([
  { in: 'params', field: 'id', required: true, type: 'integer', min: 1 },
]), async (req, res) => {
  try {
    const { id } = req.params;

    if (process.env.NODE_ENV !== 'production') {
      console.log('Attempting to delete location with id:', id);
    }

    const location = await Location.findByPk(id, {
      include: [{ model: Inventory, as: 'inventory' }]
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log('Location found:', location ? location.name : 'null');
    }

    if (!location) {
      console.log('Location not found, returning 404');
      return res.status(404).json({ message: 'Location not found' });
    }

    // Check if location has inventory with actual products (quantity > 0)
    const hasActualInventory = location.inventory && location.inventory.some(item =>
      parseFloat(item.quantitySqm) > 0
    );

    if (process.env.NODE_ENV !== 'production') {
      console.log('Location has inventory with products:', hasActualInventory);
    }

    if (hasActualInventory) {
      console.log('Cannot delete due to inventory');
      return res.status(400).json({
        message: 'Cannot delete location that contains products. Please move or remove all products first.'
      });
    }

    // Check if location has users assigned
    const userCount = await User.count({ where: { locationId: id } });
    if (process.env.NODE_ENV !== 'production') {
      console.log('Location has users assigned:', userCount);
    }

    if (userCount > 0) {
      console.log('Cannot delete due to users');
      return res.status(400).json({
        message: `Cannot delete location that has ${userCount} user(s) assigned. Please reassign users to another location first.`
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

    if (process.env.NODE_ENV !== 'production') {
      console.log('Deleting location...');
    }
    await location.destroy();
    if (process.env.NODE_ENV !== 'production') {
      console.log('Location deleted successfully');
    }

    // Invalidate cache
    cache.delete('locations:all');

    res.json({ message: 'Location deleted successfully' });

  } catch (error) {
    console.error('Delete location error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
