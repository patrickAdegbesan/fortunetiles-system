@echo off
echo Fixing database schema...
cd backend
psql -U postgres -d fortunetiles -c "ALTER TABLE products ADD COLUMN IF NOT EXISTS category VARCHAR(255) DEFAULT 'General';"
psql -U postgres -d fortunetiles -c "ALTER TABLE products ADD COLUMN IF NOT EXISTS imageUrl VARCHAR(255);"
psql -U postgres -d fortunetiles -c "ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;"
psql -U postgres -d fortunetiles -c "ALTER TABLE products ADD COLUMN IF NOT EXISTS isActive BOOLEAN DEFAULT true;"
psql -U postgres -d fortunetiles -c "ALTER TABLE products ADD COLUMN IF NOT EXISTS deletedAt TIMESTAMP WITH TIME ZONE;"
echo Database schema updated!
pause
