const express = require('express');
const { Product, ProductType, Inventory, InventoryLog } = require('../models');
const { sequelize } = require('../config/database');

const router = express.Router();

// Validation middleware for product attributes
const validateProductAttributes = async (req, res, next) => {
  try {
    const { productTypeId, customAttributes } = req.body;
    
    if (!productTypeId) {
      return res.status(400).json({ message: 'Product type is required' });
    }

    const productType = await ProductType.findByPk(productTypeId);
    if (!productType) {
      return res.status(400).json({ message: 'Invalid product type' });
    }

    // Validate required fields
    const requiredFields = productType.attributes.requiredFields || [];
    const missingFields = requiredFields.filter(field => !customAttributes || !customAttributes[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        message: `Missing required fields for ${productType.name}: ${missingFields.join(', ')}` 
      });
    }

    // Add product type to request for later use
    req.productType = productType;
    next();
  } catch (error) {
    console.error('Product validation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/products/categories - Get product categories (MUST be before /:id route)
router.get('/categories', async (req, res) => {
  try {
    const categories = await Product.findAll({
      attributes: ['category'],
      group: ['category'],
      where: { isActive: true }
    });

    const categoryList = categories.map(item => item.category).filter(Boolean);
    
    // Add default categories if none exist
    const defaultCategories = ['Marble', 'Granite', 'Ceramic', 'Porcelain', 'Travertine', 'General'];
    const allCategories = [...new Set([...categoryList, ...defaultCategories])];

    res.json({
      message: 'Categories retrieved successfully',
      categories: allCategories
    });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/products/types - Get all product types
router.get('/types', async (req, res) => {
  try {
    const types = await ProductType.findAll({
      where: { isActive: true }
    });

    res.json({
      message: 'Product types retrieved successfully',
      types
    });
  } catch (error) {
    console.error('Get product types error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/products - Get all products
router.get('/', async (req, res) => {
  try {
    const products = await Product.findAll({
      include: [{
        model: ProductType,
        as: 'productType',
        attributes: ['name', 'unitOfMeasure', 'attributes']
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      message: 'Products retrieved successfully',
      products
    });

  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Internal server error' });
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
router.post('/', validateProductAttributes, async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    console.log('Received request body:', req.body);
    const { 
      name, 
      productTypeId,
      price, 
      customAttributes,
      supplierCode, 
      category, 
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

    // Create product
    const newProduct = await Product.create({
      name,
      productTypeId,
      price,
      customAttributes,
      supplierCode,
      category: category || 'General',
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
router.put('/:id', validateProductAttributes, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      productTypeId,
      price, 
      customAttributes,
      supplierCode, 
      category, 
      imageUrl, 
      description, 
      isActive 
    } = req.body;

    const product = await Product.findByPk(id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await product.update({
      name: name || product.name,
      productTypeId: productTypeId || product.productTypeId,
      price: price || product.price,
      customAttributes: customAttributes || product.customAttributes,
      supplierCode: supplierCode || product.supplierCode,
      category: category || product.category,
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
