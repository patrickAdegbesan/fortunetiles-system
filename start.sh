#!/bin/sh
set -e

echo "Running database migrations (no destructive undo)..."
npx sequelize-cli db:migrate --env production 2>&1 | tee migration.log

echo "✅ Migrations complete"

echo "Starting application..."
node server.js