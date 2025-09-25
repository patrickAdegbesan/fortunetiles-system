const { sequelize } = require('./config/database');
const { Inventory, InventoryLog, User } = require('./models');

async function resetAllInventoryToZero() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('🔄 Starting inventory reset process...');
    
    // Get count of current inventory records
    const inventoryCount = await Inventory.count({ transaction });
    console.log(`📦 Found ${inventoryCount} inventory records to reset`);
    
    if (inventoryCount === 0) {
      console.log('✅ No inventory records found. Nothing to reset.');
      await transaction.commit();
      return;
    }

    // Get all current inventory records
    const inventoryRecords = await Inventory.findAll({
      include: [
        { model: require('./models').Product, as: 'product', attributes: ['name'] },
        { model: require('./models').Location, as: 'location', attributes: ['name'] }
      ],
      transaction
    });

    console.log('📝 Creating inventory log entries for the reset...');
    
    // Create log entries for each inventory reset (optional - for audit trail)
    const logEntries = inventoryRecords.map(record => ({
      productId: record.productId,
      locationId: record.locationId,
      changeType: 'adjusted',
      changeAmount: -record.quantitySqm, // Negative amount to bring to zero
      previousQuantity: record.quantitySqm,
      newQuantity: 0,
      notes: 'System-wide inventory reset - all stock set to zero',
      userId: 1 // Assuming admin user ID is 1, adjust if needed
    }));

    // Batch insert log entries
    if (logEntries.length > 0) {
      await InventoryLog.bulkCreate(logEntries, { transaction });
      console.log(`📋 Created ${logEntries.length} log entries`);
    }

    // Reset all inventory quantities to 0
    const [updatedRows] = await Inventory.update(
      { quantitySqm: 0 },
      { 
        where: {},
        transaction
      }
    );

    await transaction.commit();
    
    console.log('✅ Inventory reset completed successfully!');
    console.log(`📊 Updated ${updatedRows} inventory records to zero`);
    console.log('📈 All stock quantities are now 0');
    
    // Show summary
    console.log('\n📋 Reset Summary:');
    inventoryRecords.forEach(record => {
      console.log(`   • ${record.product?.name || 'Unknown Product'} at ${record.location?.name || 'Unknown Location'}: ${record.quantitySqm} → 0`);
    });
    
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error resetting inventory:', error);
    throw error;
  }
}

async function confirmReset() {
  console.log('⚠️  WARNING: This will reset ALL inventory quantities to ZERO!');
  console.log('🔄 This action will:');
  console.log('   - Set all product stock levels to 0');
  console.log('   - Create audit log entries for the changes');
  console.log('   - Cannot be easily undone');
  console.log('');
  
  // In a script environment, we'll proceed directly
  // In production, you might want to add a confirmation prompt
  console.log('🚀 Proceeding with inventory reset...');
  
  await resetAllInventoryToZero();
}

// Self-executing function
(async () => {
  try {
    await confirmReset();
    console.log('🎉 Inventory reset process completed!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Failed to reset inventory:', error);
    process.exit(1);
  }
})();