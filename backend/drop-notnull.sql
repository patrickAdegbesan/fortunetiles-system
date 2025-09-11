-- Make userId nullable in inventory_logs
ALTER TABLE inventory_logs ALTER COLUMN "userId" DROP NOT NULL;
