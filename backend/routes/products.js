const express = require('express');
const { Product, Inventory, InventoryLog } = require('../models');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

const router = express.Router();

// GET /api/products/categories - Get product categories (MUST be before /:id route)
router.get('/categories', async (req, res) => {
  try {
    const products = await Product.findAll({
      attributes: ['categories'],
      where: {
        isActive: true,
        categories: {
          [Op.ne]: null
        }
      },
      raw: true
    });

    // Extract all unique categories from the arrays
    const allCategories = new Set();
    products.forEach(product => {
      if (Array.isArray(product.categories)) {
        product.categories.forEach(cat => {
          if (cat && cat.trim()) {
            allCategories.add(cat.trim());
          }
        });
      }
    });

    // Convert to sorted array
    const categoriesArray = Array.from(allCategories).sort();

    // If no categories exist in products, provide default categories
    const defaultCategories = ['General', 'Luxury', 'Premium', 'Marble', 'Granite', 'Ceramic', 'Porcelain', 'Travertine'];
    const finalCategories = categoriesArray.length > 0 ? categoriesArray : defaultCategories;

    console.log('Products/categories - Categories found in DB:', categoriesArray.length);
    console.log('Products/categories - Returning categories:', finalCategories);

    res.json({
      message: 'Categories retrieved successfully',
      categories: finalCategories
    });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// GET /api/products - Get all products with optimized queries and caching
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      category,
      locationId,
      search,
      isActive = true
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = { isActive };

    // Build optimized where clause
    if (category) {
      // For category filtering, check if the category exists in the categories array
      whereClause[Op.and] = whereClause[Op.and] || [];
      whereClause[Op.and].push(
        sequelize.where(
          sequelize.fn('array_position', sequelize.col('categories'), category),
          { [Op.ne]: null }
        )
      );
    }
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Optimized includes - only fetch needed attributes
    const includeClause = [];

    // Include inventory with optimized query
    if (locationId) {
      includeClause.push({
        model: Inventory,
        as: 'inventory',
        where: { locationId },
        required: false,
        attributes: ['id', 'quantitySqm', 'locationId']
      });
    }

    const products = await Product.findAndCountAll({
      where: whereClause,
      include: includeClause,
      attributes: [
        'id', 'name', 'description', 'categories', 'price',
        'isActive', 'attributes', 'unitOfMeasure', 'createdAt', 'updatedAt'
      ], // Only fetch needed product attributes
      order: [['name', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      subQuery: false, // Optimize for better performance
      distinct: true // Ensure accurate count with joins
    });

    res.json({
      message: 'Products retrieved successfully',
      products: products.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(products.count / limit),
        totalItems: products.count,
        itemsPerPage: parseInt(limit),
        hasNextPage: (parseInt(page) * parseInt(limit)) < products.count,
        hasPrevPage: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/products/:id - Get single product
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const product = await Product.findByPk(id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({
      message: 'Product retrieved successfully',
      product
    });

  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/products - Create new product
router.post('/', async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    console.log('Received request body:', req.body);
    const {
      name,
      price,
      attributes,
      supplierCode,
      categories,
      unitOfMeasure,
      imageUrl,
      description,
      isActive,
      // Initial inventory fields
      initialLocation,
      initialQuantity
    } = req.body;

    // Basic validation
    if (!name || !price) {
      await transaction.rollback();
      return res.status(400).json({
        message: 'Name and price are required'
      });
    }

    // Initial inventory validation
    if (!initialLocation || !initialQuantity || parseFloat(initialQuantity) <= 0) {
      await transaction.rollback();
      return res.status(400).json({
        message: 'Initial location and quantity are required'
      });
    }

    // Ensure categories is an array
    const productCategories = Array.isArray(categories) ? categories : ['General'];

    // Create product
    const newProduct = await Product.create({
      name,
      price,
      attributes: attributes || {},
      supplierCode,
      categories: productCategories,
      unitOfMeasure: unitOfMeasure || 'pcs',
      imageUrl,
      description,
      isActive: isActive !== undefined ? isActive : true
    }, { transaction });

    // Create initial inventory record
    const inventory = await Inventory.create({
      productId: newProduct.id,
      locationId: initialLocation,
      quantitySqm: initialQuantity
    }, { transaction });

    // Log the initial inventory
    await InventoryLog.create({
      productId: newProduct.id,
      locationId: initialLocation,
      changeType: 'initial',
      changeAmount: initialQuantity,
      previousQuantity: 0,
      newQuantity: initialQuantity,
      notes: 'Initial inventory on product creation',
      userId: req.user?.id || null // Make userId optional
    }, { transaction });

    await transaction.commit();

    res.status(201).json({
      message: 'Product created successfully with initial inventory',
      product: newProduct,
      inventory
    });

  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/products/:id - Update product
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      price,
      attributes,
      supplierCode,
      categories,
      unitOfMeasure,
      imageUrl,
      description,
      isActive
    } = req.body;

    const product = await Product.findByPk(id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Ensure categories is an array if provided
    const productCategories = categories !== undefined
      ? (Array.isArray(categories) ? categories : [categories])
      : product.categories;

    await product.update({
      name: name || product.name,
      price: price || product.price,
      attributes: attributes !== undefined ? attributes : product.attributes,
      supplierCode: supplierCode || product.supplierCode,
      categories: productCategories,
      unitOfMeasure: unitOfMeasure || product.unitOfMeasure,
      imageUrl: imageUrl !== undefined ? imageUrl : product.imageUrl,
      description: description !== undefined ? description : product.description,
      isActive: isActive !== undefined ? isActive : product.isActive
    });

    res.json({
      message: 'Product updated successfully',
      product
    });

  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /api/products/:id - Soft delete product
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const product = await Product.findByPk(id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Soft delete using paranoid mode
    await product.destroy();

    res.json({ message: 'Product archived successfully' });

  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
