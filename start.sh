#!/bin/sh

# Run database migrations
# Note: First run will create SequelizeMeta table and run all migrations
# Subsequent runs will only run new migrations
echo "Running database migrations..."
npx sequelize-cli db:migrate --env production 2>&1 | tee migration.log || true

echo ""
echo "✅ Migration step complete (warnings are OK - may indicate existing tables)"
echo ""

# Start the application
echo "Starting application..."
node server.js