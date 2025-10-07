const express = require('express');
const { GlobalAttribute } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

const normalizeName = (value = '') => value.trim();

// All routes require authentication
router.use(authenticateToken);

// GET /api/global-attributes - Retrieve all global attributes
router.get('/', async (req, res) => {
  try {
    const attributes = await GlobalAttribute.findAll({
      order: [['name', 'ASC']],
    });

    res.json({
      message: 'Global attributes retrieved successfully',
      attributes: attributes.map((attribute) => ({
        id: attribute.id,
        name: attribute.name,
      })),
    });
  } catch (error) {
    console.error('Get global attributes error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Admin-specific routes
router.use(requireRole(['admin', 'owner']));

// POST /api/global-attributes - Create a new global attribute
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    const normalizedName = normalizeName(name);

    if (!normalizedName) {
      return res.status(400).json({ message: 'Attribute name is required' });
    }

    const [attribute, created] = await GlobalAttribute.findOrCreate({
      where: { name: normalizedName },
      defaults: { name: normalizedName },
    });

    if (!created) {
      return res.status(400).json({ message: 'Attribute already exists' });
    }

    res.status(201).json({
      message: 'Global attribute created successfully',
      attribute: {
        id: attribute.id,
        name: attribute.name,
      },
    });
  } catch (error) {
    console.error('Create global attribute error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /api/global-attributes - Delete a global attribute by name
router.delete('/', async (req, res) => {
  try {
    const { name } = req.body;
    const normalizedName = normalizeName(name);

    if (!normalizedName) {
      return res.status(400).json({ message: 'Attribute name is required' });
    }

    const deleted = await GlobalAttribute.destroy({ where: { name: normalizedName } });

    if (!deleted) {
      return res.status(404).json({ message: 'Attribute not found' });
    }

    res.json({
      message: 'Global attribute deleted successfully',
      deletedName: normalizedName,
    });
  } catch (error) {
    console.error('Delete global attribute error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
