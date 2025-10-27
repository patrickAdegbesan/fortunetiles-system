'use strict';

module.exports = {
	async up(queryInterface, Sequelize) {
		// Ensure 'returns' and 'return_items' exist (idempotent guard)
		await queryInterface.sequelize.query(`
			DO $$
			BEGIN
				-- Create returns table if missing
				IF NOT EXISTS (
					SELECT 1 FROM information_schema.tables
					WHERE table_schema = 'public' AND table_name = 'returns'
				) THEN
					CREATE TABLE public.returns (
						id SERIAL PRIMARY KEY,
						saleId INTEGER NOT NULL,
						processedById INTEGER NOT NULL,
						returnDate TIMESTAMPTZ NOT NULL DEFAULT NOW(),
						returnType TEXT NOT NULL,
						reason TEXT NULL,
						status TEXT NOT NULL DEFAULT 'PENDING',
						totalRefundAmount NUMERIC(10,2) NULL,
						refundMethod TEXT NULL,
						notes TEXT NULL,
						"createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
						"updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
					);
				END IF;

				-- Create return_items table if missing
				IF NOT EXISTS (
					SELECT 1 FROM information_schema.tables
					WHERE table_schema = 'public' AND table_name = 'return_items'
				) THEN
					CREATE TABLE public.return_items (
						id SERIAL PRIMARY KEY,
						returnId INTEGER NOT NULL,
						saleItemId INTEGER NOT NULL,
						productId INTEGER NOT NULL,
						locationId INTEGER NOT NULL,
						quantity NUMERIC(10,2) NOT NULL,
						returnReason TEXT NULL,
						condition TEXT NOT NULL DEFAULT 'PERFECT',
						refundAmount NUMERIC(10,2) NULL,
						exchangeProductId INTEGER NULL,
						"createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
						"updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
					);
				END IF;
			END $$;
		`);

		// Add basic FKs if tables exist and FKs missing (best-effort)
		await queryInterface.sequelize.query(`
			DO $$
			BEGIN
				-- returns FKs (best-effort, ignore if already exist)
				IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='returns')
					 AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='sales')
					 AND NOT EXISTS (
						 SELECT 1 FROM information_schema.table_constraints tc
						 WHERE tc.table_name = 'returns' AND tc.constraint_name = 'returns_saleid_fkey'
					 ) THEN
					BEGIN
						ALTER TABLE returns
						ADD CONSTRAINT returns_saleid_fkey FOREIGN KEY (saleid) REFERENCES sales(id) ON DELETE CASCADE;
					EXCEPTION WHEN duplicate_object THEN NULL; END;
				END IF;

				IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='returns')
					 AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='users')
					 AND NOT EXISTS (
						 SELECT 1 FROM information_schema.table_constraints tc
						 WHERE tc.table_name = 'returns' AND tc.constraint_name = 'returns_processedbyid_fkey'
					 ) THEN
					BEGIN
						ALTER TABLE returns
						ADD CONSTRAINT returns_processedbyid_fkey FOREIGN KEY (processedbyid) REFERENCES users(id);
					EXCEPTION WHEN duplicate_object THEN NULL; END;
				END IF;

				-- return_items FKs (best-effort, ignore if already exist)
				IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='return_items')
					 AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='returns')
					 AND NOT EXISTS (
						 SELECT 1 FROM information_schema.table_constraints tc
						 WHERE tc.table_name = 'return_items' AND tc.constraint_name = 'return_items_returnId_fkey'
					 ) THEN
					BEGIN
						ALTER TABLE return_items
						ADD CONSTRAINT return_items_returnId_fkey FOREIGN KEY ("returnId") REFERENCES returns(id) ON DELETE CASCADE;
					EXCEPTION 
						WHEN duplicate_object THEN NULL;
						WHEN undefined_column THEN RAISE NOTICE 'Column returnId does not exist in return_items';
					END;
				END IF;

				IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='return_items')
					 AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='sale_items')
					 AND NOT EXISTS (
						 SELECT 1 FROM information_schema.table_constraints tc
						 WHERE tc.table_name = 'return_items' AND tc.constraint_name = 'return_items_saleItemId_fkey'
					 ) THEN
					BEGIN
						ALTER TABLE return_items
						ADD CONSTRAINT return_items_saleItemId_fkey FOREIGN KEY ("saleItemId") REFERENCES sale_items(id);
					EXCEPTION WHEN duplicate_object THEN NULL; END;
				END IF;

				IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='return_items')
					 AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='products')
					 AND NOT EXISTS (
						 SELECT 1 FROM information_schema.table_constraints tc
						 WHERE tc.table_name = 'return_items' AND tc.constraint_name = 'return_items_productId_fkey'
					 ) THEN
					BEGIN
						ALTER TABLE return_items
						ADD CONSTRAINT return_items_productId_fkey FOREIGN KEY ("productId") REFERENCES products(id);
					EXCEPTION WHEN duplicate_object THEN NULL; END;
				END IF;

				IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='return_items')
					 AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='locations')
					 AND NOT EXISTS (
						 SELECT 1 FROM information_schema.table_constraints tc
						 WHERE tc.table_name = 'return_items' AND tc.constraint_name = 'return_items_locationId_fkey'
					 ) THEN
					BEGIN
						ALTER TABLE return_items
						ADD CONSTRAINT return_items_locationId_fkey FOREIGN KEY ("locationId") REFERENCES locations(id);
					EXCEPTION WHEN duplicate_object THEN NULL; END;
				END IF;
			END $$;
		`);
	},

	async down(queryInterface, Sequelize) {
		// No-op: we won't drop tables in down to avoid data loss
	}
};

