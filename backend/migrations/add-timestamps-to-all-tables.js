'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = [
      'users', 'locations', 'categories', 'global_attributes', 
      'product_types', 'products', 'inventory', 'sales', 
      'sale_items', 'returns', 'return_items', 'user_activities'
    ];

    for (const table of tables) {
      // Add created_at if it doesn't exist
      await queryInterface.sequelize.query(`
        DO $$ 
        BEGIN 
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name='${table}' AND column_name='created_at') THEN
            ALTER TABLE ${table} ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
          END IF;
        END $$;
      `);

      // Add updated_at if it doesn't exist
      await queryInterface.sequelize.query(`
        DO $$ 
        BEGIN 
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name='${table}' AND column_name='updated_at') THEN
            ALTER TABLE ${table} ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
          END IF;
        END $$;
      `);
    }
  },

  async down(queryInterface, Sequelize) {
    // Optional: remove columns if needed
  }
};