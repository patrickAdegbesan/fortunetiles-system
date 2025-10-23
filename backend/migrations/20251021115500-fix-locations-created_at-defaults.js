'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Ensure locations.created_at/updated_at have defaults so inserts that specify camelCase still succeed
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        -- created_at default
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'locations' AND column_name = 'created_at'
        ) THEN
          BEGIN
            ALTER TABLE "locations" ALTER COLUMN created_at SET DEFAULT NOW();
          EXCEPTION WHEN undefined_column THEN NULL; END;
        END IF;

        -- updated_at default
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'locations' AND column_name = 'updated_at'
        ) THEN
          BEGIN
            ALTER TABLE "locations" ALTER COLUMN updated_at SET DEFAULT NOW();
          EXCEPTION WHEN undefined_column THEN NULL; END;
        END IF;
      END $$;
    `);
  },

  async down(queryInterface, Sequelize) {
    // Optional: remove defaults
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'locations' AND column_name = 'created_at'
        ) THEN
          BEGIN
            ALTER TABLE "locations" ALTER COLUMN created_at DROP DEFAULT;
          EXCEPTION WHEN undefined_column THEN NULL; END;
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'locations' AND column_name = 'updated_at'
        ) THEN
          BEGIN
            ALTER TABLE "locations" ALTER COLUMN updated_at DROP DEFAULT;
          EXCEPTION WHEN undefined_column THEN NULL; END;
        END IF;
      END $$;
    `);
  }
};
