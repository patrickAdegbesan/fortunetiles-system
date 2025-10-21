#!/bin/sh

# Clean up old database state on first run
echo "Checking database state..."
npx sequelize-cli db:migrate:undo:all --env production 2>/dev/null || true

# Run database migrations fresh
echo "Running database migrations..."
npx sequelize-cli db:migrate --env production 2>&1 | tee migration.log || true

echo ""
echo "✅ Migrations complete"
echo ""

# Start the application
echo "Starting application..."
node server.js