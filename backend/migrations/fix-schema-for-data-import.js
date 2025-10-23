'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Fix schema issues for data import

    // 1. Remove locationId column from sale_items if it exists (not needed in current schema)
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_name='sale_items' AND column_name='locationId') THEN
          ALTER TABLE sale_items DROP COLUMN "locationId";
        END IF;
      END $$;
    `);

    // 2. Ensure user_activities table has correct column names
    // Check if user_id exists and rename to userId if needed
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_name='user_activities' AND column_name='user_id') AND
           NOT EXISTS (SELECT 1 FROM information_schema.columns
                      WHERE table_name='user_activities' AND column_name='userId') THEN
          ALTER TABLE user_activities RENAME COLUMN user_id TO "userId";
        END IF;
      END $$;
    `);

    // 3. Make unit_of_measure nullable temporarily for import, then we'll fix the data
    await queryInterface.sequelize.query(`
      ALTER TABLE product_types ALTER COLUMN unit_of_measure DROP NOT NULL;
    `);
  },

  async down(queryInterface, Sequelize) {
    // Revert changes
    await queryInterface.sequelize.query(`
      ALTER TABLE product_types ALTER COLUMN unit_of_measure SET NOT NULL;
    `);

    // Note: We don't restore locationId or rename userId back as these are schema fixes
  }
};