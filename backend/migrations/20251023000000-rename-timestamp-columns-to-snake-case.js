'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Rename createdAt to created_at and updatedAt to updated_at for all tables
    const tables = [
      'users',
      'locations',
      'categories',
      'sales',
      'user_activities',
      'global_attributes',
      'product_types',
      'products',
      'inventory',
      'sale_items',
      'returns',
      'return_items'
    ];

    for (const table of tables) {
      try {
        // Check if table exists
        const existingTables = await queryInterface.showAllTables();
        if (!existingTables.includes(table)) {
          console.log(`Table ${table} does not exist, skipping...`);
          continue;
        }

        // Check if camelCase columns exist
        const [columns] = await queryInterface.sequelize.query(
          `SELECT column_name FROM information_schema.columns WHERE table_name = '${table}' AND column_name IN ('createdAt', 'updatedAt')`
        );

        if (columns.length > 0) {
          console.log(`Renaming columns in ${table}...`);

          // Rename createdAt to created_at
          await queryInterface.renameColumn(table, 'createdAt', 'created_at');

          // Rename updatedAt to updated_at (if it exists)
          const hasUpdatedAt = columns.some(col => col.column_name === 'updatedAt');
          if (hasUpdatedAt) {
            await queryInterface.renameColumn(table, 'updatedAt', 'updated_at');
          }

          console.log(`✅ Renamed columns in ${table}`);
        } else {
          console.log(`Columns already renamed in ${table}, skipping...`);
        }
      } catch (error) {
        console.log(`Error processing ${table}: ${error.message}`);
      }
    }
  },

  async down (queryInterface, Sequelize) {
    // Rename back to camelCase
    const tables = [
      'users',
      'locations',
      'categories',
      'sales',
      'user_activities',
      'global_attributes',
      'product_types',
      'products',
      'inventory',
      'sale_items',
      'returns',
      'return_items'
    ];

    for (const table of tables) {
      try {
        // Check if table exists
        const existingTables = await queryInterface.showAllTables();
        if (!existingTables.includes(table)) {
          continue;
        }

        // Check if snake_case columns exist
        const [columns] = await queryInterface.sequelize.query(
          `SELECT column_name FROM information_schema.columns WHERE table_name = '${table}' AND column_name IN ('created_at', 'updated_at')`
        );

        if (columns.length > 0) {
          // Rename created_at back to createdAt
          await queryInterface.renameColumn(table, 'created_at', 'createdAt');

          // Rename updated_at back to updatedAt (if it exists)
          const hasUpdatedAt = columns.some(col => col.column_name === 'updated_at');
          if (hasUpdatedAt) {
            await queryInterface.renameColumn(table, 'updated_at', 'updatedAt');
          }
        }
      } catch (error) {
        console.log(`Error reverting ${table}: ${error.message}`);
      }
    }
  }
};