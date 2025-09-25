const { sequelize } = require('./config/database');
const { Inventory, InventoryLog } = require('./models');

async function resetProductionInventoryToZero() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('🌐 Starting PRODUCTION inventory reset process...');
    console.log(`📡 Connected to: ${process.env.NODE_ENV || 'development'} database`);
    
    // Get count of current inventory records
    const inventoryCount = await Inventory.count({ transaction });
    console.log(`📦 Found ${inventoryCount} inventory records to reset`);
    
    if (inventoryCount === 0) {
      console.log('✅ No inventory records found. Nothing to reset.');
      await transaction.commit();
      return;
    }

    // Get all current inventory records with details
    const inventoryRecords = await Inventory.findAll({
      include: [
        { model: require('./models').Product, as: 'product', attributes: ['name'] },
        { model: require('./models').Location, as: 'location', attributes: ['name'] }
      ],
      transaction
    });

    console.log('📝 Creating audit log entries for production reset...');
    
    // Create log entries for each inventory reset
    const logEntries = inventoryRecords.map(record => ({
      productId: record.productId,
      locationId: record.locationId,
      changeType: 'adjusted',
      changeAmount: -record.quantitySqm,
      previousQuantity: record.quantitySqm,
      newQuantity: 0,
      notes: 'PRODUCTION inventory reset - all stock set to zero via server script',
      userId: 1 // System admin
    }));

    // Batch insert log entries
    if (logEntries.length > 0) {
      await InventoryLog.bulkCreate(logEntries, { transaction });
      console.log(`📋 Created ${logEntries.length} audit log entries`);
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
    
    console.log('✅ PRODUCTION inventory reset completed successfully!');
    console.log(`📊 Updated ${updatedRows} inventory records to zero`);
    console.log('🌐 All live stock quantities are now 0');
    
    // Show summary
    console.log('\n📋 Production Reset Summary:');
    inventoryRecords.forEach(record => {
      console.log(`   • ${record.product?.name || 'Unknown Product'} at ${record.location?.name || 'Unknown Location'}: ${record.quantitySqm} → 0`);
    });
    
    return {
      success: true,
      recordsUpdated: updatedRows,
      logsCreated: logEntries.length
    };
    
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error resetting production inventory:', error);
    throw error;
  }
}

// For Heroku one-off dyno execution
if (require.main === module) {
  (async () => {
    try {
      console.log('🚀 PRODUCTION INVENTORY RESET STARTING...');
      console.log('⚠️  This will reset ALL inventory on the live server!');
      
      const result = await resetProductionInventoryToZero();
      
      console.log('🎉 Production inventory reset completed successfully!');
      console.log(`📊 Final result: ${result.recordsUpdated} records updated, ${result.logsCreated} logs created`);
      
      process.exit(0);
    } catch (error) {
      console.error('💥 Failed to reset production inventory:', error);
      process.exit(1);
    }
  })();
}

module.exports = resetProductionInventoryToZero;