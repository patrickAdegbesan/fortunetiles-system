'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add missing camelCase timestamp columns to locations if they don't exist
    // This matches existing model definitions expecting createdAt/updatedAt
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'locations'
            AND column_name = 'createdAt'
        ) THEN
          ALTER TABLE "locations"
          ADD COLUMN "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'locations'
            AND column_name = 'updatedAt'
        ) THEN
          ALTER TABLE "locations"
          ADD COLUMN "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();
        END IF;
      END $$;
    `);
  },

  async down(queryInterface, Sequelize) {
    // Safely drop the columns only if they exist
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'locations'
            AND column_name = 'createdAt'
        ) THEN
          ALTER TABLE "locations" DROP COLUMN "createdAt";
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'locations'
            AND column_name = 'updatedAt'
        ) THEN
          ALTER TABLE "locations" DROP COLUMN "updatedAt";
        END IF;
      END $$;
    `);
  }
};
