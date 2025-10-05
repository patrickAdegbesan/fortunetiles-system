const express = require('express');
const { ProductType, Product, ReturnItem, Op } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Apply authentication and admin role requirement to all routes
router.use(authenticateToken);
router.use(requireRole(['admin', 'owner']));

// GET /api/product-types - Get all product types
router.get('/', async (req, res) => {
  try {
    const productTypes = await ProductType.findAll({
      order: [['name', 'ASC']]
    });

    res.json({
      message: 'Product types retrieved successfully',
      productTypes
    });

  } catch (error) {
    console.error('Get product types error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/product-types/:id - Get single product type
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const productType = await ProductType.findByPk(id);
    
    if (!productType) {
      return res.status(404).json({ message: 'Product type not found' });
    }

    res.json({
      message: 'Product type retrieved successfully',
      productType
    });

  } catch (error) {
    console.error('Get product type error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/product-types - Create new product type
router.post('/', async (req, res) => {
  try {
    const { name, unitOfMeasure, attributes } = req.body;

    if (!name || !unitOfMeasure) {
      return res.status(400).json({ 
        message: 'Name and unit of measure are required' 
      });
    }

    // Check if product type with this name already exists
    const existingType = await ProductType.findOne({ where: { name } });
    if (existingType) {
      return res.status(400).json({ 
        message: 'Product type with this name already exists' 
      });
    }

    const newProductType = await ProductType.create({
      name,
      unitOfMeasure,
      attributes: attributes || {}
    });

    res.status(201).json({
      message: 'Product type created successfully',
      productType: newProductType
    });

  } catch (error) {
    console.error('Create product type error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ 
        message: 'Product type with this name already exists' 
      });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/product-types/:id - Update product type
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, unitOfMeasure, attributes, isActive } = req.body;

    const productType = await ProductType.findByPk(id);
    
    if (!productType) {
      return res.status(404).json({ message: 'Product type not found' });
    }

    // If name is being changed, check for uniqueness
    if (name && name !== productType.name) {
      const existingType = await ProductType.findOne({ where: { name } });
      if (existingType) {
        return res.status(400).json({ 
          message: 'Product type with this name already exists' 
        });
      }
    }

    await productType.update({
      name: name || productType.name,
      unitOfMeasure: unitOfMeasure || productType.unitOfMeasure,
      attributes: attributes !== undefined ? attributes : productType.attributes,
      isActive: isActive !== undefined ? isActive : productType.isActive
    });

    res.json({
      message: 'Product type updated successfully',
      productType
    });

  } catch (error) {
    console.error('Update product type error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ 
        message: 'Product type with this name already exists' 
      });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /api/product-types/:id - Delete product type
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const productType = await ProductType.findByPk(id);
    
    if (!productType) {
      return res.status(404).json({ message: 'Product type not found' });
    }

    // Check if any products are using this product type
    const productsUsingType = await Product.count({
      where: { productTypeId: id }
    });

    if (productsUsingType > 0) {
      // Get all products with this product type
      const products = await Product.findAll({
        where: { productTypeId: id },
        attributes: ['id']
      });

      const productIds = products.map(p => p.id);

      // Check if any of these products are referenced in return items
      const returnItemsCount = await ReturnItem.count({
        where: { productId: { [Op.in]: productIds } }
      });

      if (returnItemsCount > 0) {
        return res.status(400).json({
          message: `Cannot delete product type. ${productsUsingType} product(s) are currently using this type and ${returnItemsCount} return item(s) reference these products. Please reassign or remove those products first.`
        });
      } else {
        return res.status(400).json({
          message: `Cannot delete product type. ${productsUsingType} product(s) are currently using this type. Please reassign or remove those products first.`
        });
      }
    }

    await productType.destroy();
    res.json({ message: 'Product type deleted successfully' });

  } catch (error) {
    console.error('Delete product type error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;