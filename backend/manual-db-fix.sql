-- Add missing columns to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS category VARCHAR(255) DEFAULT 'General';
ALTER TABLE products ADD COLUMN IF NOT EXISTS "imageUrl" VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP WITH TIME ZONE;

-- Update existing records with default values
UPDATE products SET category = 'General' WHERE category IS NULL;
UPDATE products SET "isActive" = true WHERE "isActive" IS NULL;

-- First, let's check the current enum values
SELECT enum_range(NULL::enum_inventory_logs_changetype);

-- Check if userId is nullable
SELECT 
    column_name, 
    is_nullable, 
    data_type, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'inventory_logs';

-- Try to add the new enum value (this might fail if it already exists)
ALTER TYPE enum_inventory_logs_changetype ADD VALUE IF NOT EXISTS 'initial';

-- Make userId nullable
ALTER TABLE inventory_logs 
ALTER COLUMN "userId" DROP NOT NULL;
