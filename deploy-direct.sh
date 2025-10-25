#!/bin/bash
# Direct Railway deployment script
# This updates the application files directly in the running container

echo "Starting direct Railway update..."

# Copy the fixed dashboard.js file
echo "Updating dashboard routes..."
cp /workspace/backend/routes/dashboard.js /app/routes/dashboard.js

# Restart the application by sending a signal
echo "Restarting application..."
kill -HUP 1

echo "Update complete!"
