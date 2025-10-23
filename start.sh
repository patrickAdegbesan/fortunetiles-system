#!/bin/sh
set -euo pipefail

echo "Running database migrations (no destructive undo)..."
npx sequelize-cli db:migrate --env production

echo "✅ Migrations complete"

echo "Starting application..."
node server.js