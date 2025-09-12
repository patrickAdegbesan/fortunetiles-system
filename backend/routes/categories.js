const express = require('express');
const { Product, sequelize } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { Op } = require('sequelize');

const router = express.Router();

// Apply authentication and admin role requirement to all routes
router.use(authenticateToken);
router.use(requireRole(['admin', 'owner']));

// GET /api/categories - Get all distinct categories from products
router.get('/', async (req, res) => {
  try {
    const categories = await Product.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('category')), 'name']],
      where: {
        category: {
          [Op.ne]: null
        }
      },
      order: [[sequelize.col('category'), 'ASC']],
      raw: true
    });

    // Filter out empty strings and format response
    const formattedCategories = categories
      .filter(cat => cat.name && cat.name.trim() !== '')
      .map(cat => ({ name: cat.name }));

    res.json({
      message: 'Categories retrieved successfully',
      categories: formattedCategories
    });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/categories - Add a new category (creates placeholder)
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ 
        message: 'Category name is required' 
      });
    }

    const trimmedName = name.trim();

    // Check if category already exists
    const existingCategory = await Product.findOne({
      where: { category: trimmedName }
    });

    if (existingCategory) {
      return res.status(400).json({ 
        message: 'Category already exists' 
      });
    }

    // Return the category name (it will become persistent when assigned to a product)
    res.status(201).json({
      message: 'Category created successfully',
      category: { name: trimmedName }
    });

  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/categories/rename - Rename a category across all products
router.put('/rename', async (req, res) => {
  try {
    const { from, to } = req.body;

    if (!from || !to || !from.trim() || !to.trim()) {
      return res.status(400).json({ 
        message: 'Both "from" and "to" category names are required' 
      });
    }

    const trimmedFrom = from.trim();
    const trimmedTo = to.trim();

    if (trimmedFrom === trimmedTo) {
      return res.status(400).json({ 
        message: 'Source and target category names cannot be the same' 
      });
    }

    // Check if source category exists
    const sourceExists = await Product.findOne({
      where: { category: trimmedFrom }
    });

    if (!sourceExists) {
      return res.status(404).json({ 
        message: 'Source category not found' 
      });
    }

    // Check if target category already exists
    const targetExists = await Product.findOne({
      where: { category: trimmedTo }
    });

    if (targetExists) {
      return res.status(400).json({ 
        message: 'Target category already exists. Use delete with reassignment instead.' 
      });
    }

    // Update all products with the old category name
    const [updatedCount] = await Product.update(
      { category: trimmedTo },
      { where: { category: trimmedFrom } }
    );

    res.json({
      message: `Category renamed successfully. ${updatedCount} product(s) updated.`,
      updatedCount
    });

  } catch (error) {
    console.error('Rename category error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /api/categories - Delete a category (with optional reassignment)
router.delete('/', async (req, res) => {
  try {
    const { name, reassignTo } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ 
        message: 'Category name is required' 
      });
    }

    const trimmedName = name.trim();
    const defaultReassignment = 'General';
    const finalReassignTo = reassignTo && reassignTo.trim() ? reassignTo.trim() : defaultReassignment;

    // Check if category exists
    const categoryExists = await Product.findOne({
      where: { category: trimmedName }
    });

    if (!categoryExists) {
      return res.status(404).json({ 
        message: 'Category not found' 
      });
    }

    // Count products using this category
    const productCount = await Product.count({
      where: { category: trimmedName }
    });

    // Update all products with this category
    const [updatedCount] = await Product.update(
      { category: finalReassignTo },
      { where: { category: trimmedName } }
    );

    res.json({
      message: `Category deleted successfully. ${updatedCount} product(s) reassigned to "${finalReassignTo}".`,
      updatedCount,
      reassignedTo: finalReassignTo
    });

  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
