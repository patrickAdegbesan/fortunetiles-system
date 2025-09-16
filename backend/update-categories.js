const { sequelize } = require('./config/database');
const { Product } = require('./models');

async function updateProductCategories() {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully');

    // Get all products
    const products = await Product.findAll();
    console.log(`Found ${products.length} products`);

    if (products.length > 0) {
      // Update each product with appropriate categories
      const updates = [];
      
      for (const product of products) {
        let category = 'General'; // Default category
        
        // Categorize based on product name
        if (product.name && product.name.toLowerCase().includes('marble')) {
          category = 'Natural Stone';
        } else if (product.name && product.name.toLowerCase().includes('granite')) {
          category = 'Natural Stone';
        } else if (product.name && product.name.toLowerCase().includes('ceramic')) {
          category = 'Ceramic Tiles';
        } else if (product.name && product.name.toLowerCase().includes('porcelain')) {
          category = 'Porcelain Tiles';
        } else if (product.name && product.name.toLowerCase().includes('travertine')) {
          category = 'Natural Stone';
        } else if (product.name && product.name.toLowerCase().includes('tile')) {
          category = 'Ceramic Tiles';
        }
        
        // Also fix the price field if it exists as pricePerSqm
        const updateData = { category };
        
        // Check if product has pricePerSqm and no price
        if (product.pricePerSqm && !product.price) {
          updateData.price = product.pricePerSqm;
        }
        
        updates.push(product.update(updateData));
        console.log(`Updating ${product.name} -> Category: ${category}`);
      }
      
      await Promise.all(updates);
      console.log('All products updated successfully!');
      
      // Verify the updates
      const updatedProducts = await Product.findAll({
        attributes: ['id', 'name', 'category', 'price']
      });
      
      console.log('\nUpdated products:');
      updatedProducts.forEach(p => {
        console.log(`${p.name} - ${p.category} - ₦${p.price}`);
      });
      
    } else {
      console.log('No products found to update');
    }

  } catch (error) {
    console.error('Error updating categories:', error);
  } finally {
    await sequelize.close();
  }
}

updateProductCategories();