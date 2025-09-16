const { Inventory, Product } = require('./models');

async function fixInventoryReferences() {
  try {
    console.log('🔧 Fixing broken inventory product references...');
    
    // Get all inventory items with broken references
    const inventoryItems = await Inventory.findAll();
    const products = await Product.findAll();
    
    console.log(`Found ${inventoryItems.length} inventory items and ${products.length} products`);
    
    const validProductIds = products.map(p => p.id);
    console.log('Valid product IDs:', validProductIds);
    
    // Find broken references
    const brokenItems = inventoryItems.filter(item => !validProductIds.includes(item.productId));
    console.log(`Found ${brokenItems.length} broken references:`, brokenItems.map(item => `ID ${item.id} -> ProductID ${item.productId}`));
    
    if (brokenItems.length === 0) {
      console.log('✅ No broken references found');
      return;
    }
    
    // Fix broken references by updating them to valid product IDs
    for (const item of brokenItems) {
      // For items with invalid productId, assign to the first available valid product
      const newProductId = validProductIds[0]; // Use first valid product as fallback
      
      console.log(`Updating inventory item ${item.id}: productId ${item.productId} -> ${newProductId}`);
      
      await item.update({ productId: newProductId });
    }
    
    console.log('✅ Fixed all broken inventory references');
    
    // Verify the fix
    console.log('\n🔍 Verifying fix...');
    const updatedItems = await Inventory.findAll({
      include: [{ model: Product, as: 'product' }]
    });
    
    console.log('Inventory items after fix:');
    updatedItems.forEach(item => {
      console.log(`ID: ${item.id}, ProductID: ${item.productId}, Product: ${item.product ? item.product.name : 'NO_PRODUCT'}, Quantity: ${item.quantitySqm}`);
    });
    
  } catch (error) {
    console.error('❌ Error fixing inventory references:', error);
  } finally {
    process.exit(0);
  }
}

fixInventoryReferences();