const express = require('express');
const { Op } = require('sequelize');
const { Category, Product, sequelize } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

const DEFAULT_CATEGORIES = ['General', 'Luxury', 'Premium', 'Marble', 'Granite', 'Ceramic', 'Porcelain', 'Travertine'];

const normalizeName = (value = '') => value.trim();

const ensureCategoriesExist = async (names, transaction) => {
  const filtered = (names || [])
    .map(normalizeName)
    .filter(Boolean);

  await Promise.all(filtered.map((name) =>
    Category.findOrCreate({
      where: { name },
      defaults: { name },
      transaction,
    })
  ));
};

const bootstrapCategories = async () => {
  const transaction = await sequelize.transaction();
  try {
    await ensureCategoriesExist(DEFAULT_CATEGORIES, transaction);

    const products = await Product.findAll({
      attributes: ['categories'],
      where: {
        categories: {
          [Op.ne]: null,
        },
      },
      raw: true,
      transaction,
    });

    const productCategoryNames = new Set();
    products.forEach((product) => {
      if (Array.isArray(product.categories)) {
        product.categories.forEach((category) => {
          const name = normalizeName(category);
          if (name) {
            productCategoryNames.add(name);
          }
        });
      }
    });

    await ensureCategoriesExist(Array.from(productCategoryNames), transaction);

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const updateProductCategories = async (fromName, toName, transaction) => {
  const normalizedFrom = normalizeName(fromName);
  const normalizedTo = normalizeName(toName) || null;

  const products = await Product.findAll({
    attributes: ['id', 'categories'],
    where: {
      categories: {
        [Op.contains]: [normalizedFrom],
      },
    },
    transaction,
  });

  let updatedCount = 0;

  for (const product of products) {
    const categories = Array.isArray(product.categories) ? product.categories.slice() : [];

    const filtered = categories.filter((category) => normalizeName(category) !== normalizedFrom);
    if (normalizedTo) {
      if (!filtered.some((category) => normalizeName(category) === normalizedTo)) {
        filtered.push(normalizedTo);
      }
    }

    if (filtered.length === 0) {
      filtered.push('General');
    }

    await Product.update(
      { categories: filtered },
      { where: { id: product.id }, transaction }
    );

    updatedCount += 1;
  }

  return updatedCount;
};

// GET /api/categories - Retrieve all categories (public)
router.get('/', async (req, res) => {
  try {
    await bootstrapCategories();

    const categories = await Category.findAll({
      order: [['name', 'ASC']],
    });

    res.json({
      message: 'Categories retrieved successfully',
      categories: categories.map((category) => ({
        id: category.id,
        name: category.name,
      })),
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// All other routes require authentication and admin role
router.use(authenticateToken);
router.use(requireRole(['admin', 'owner']));

// POST /api/categories - Create a new category
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;

    const normalizedName = normalizeName(name);
    if (!normalizedName) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    const [category, created] = await Category.findOrCreate({
      where: { name: normalizedName },
      defaults: { name: normalizedName },
    });

    if (!created) {
      return res.status(400).json({ message: 'Category already exists' });
    }

    res.status(201).json({
      message: 'Category created successfully',
      category: {
        id: category.id,
        name: category.name,
      },
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/categories/rename - Rename a category
router.put('/rename', async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { from, to } = req.body;

    const fromName = normalizeName(from);
    const toName = normalizeName(to);

    if (!fromName || !toName) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Both "from" and "to" category names are required' });
    }

    if (fromName === toName) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Source and target category names cannot be the same' });
    }

    const category = await Category.findOne({ where: { name: fromName }, transaction });
    if (!category) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Source category not found' });
    }

    const existingTarget = await Category.findOne({ where: { name: toName }, transaction });
    if (existingTarget) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Target category already exists' });
    }

    await category.update({ name: toName }, { transaction });
    await ensureCategoriesExist([toName], transaction);
    const updatedCount = await updateProductCategories(fromName, toName, transaction);

    await transaction.commit();

    res.json({
      message: `Category renamed successfully. ${updatedCount} product(s) updated.`,
      updatedCount,
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Rename category error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /api/categories - Delete a category and optionally reassign
router.delete('/', async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { name, reassignTo } = req.body;

    const categoryName = normalizeName(name);
    if (!categoryName) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Category name is required' });
    }

    if (categoryName === 'General') {
      await transaction.rollback();
      return res.status(400).json({ message: 'The "General" category cannot be deleted' });
    }

    const category = await Category.findOne({ where: { name: categoryName }, transaction });
    if (!category) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Category not found' });
    }

    const fallbackName = normalizeName(reassignTo) || 'General';
    await ensureCategoriesExist([fallbackName], transaction);

    const updatedCount = await updateProductCategories(categoryName, fallbackName, transaction);

    await Category.destroy({ where: { id: category.id }, transaction });

    await transaction.commit();

    res.json({
      message: `Category deleted successfully. ${updatedCount} product(s) updated.`,
      updatedCount,
      reassignedTo: fallbackName,
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Delete category error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;