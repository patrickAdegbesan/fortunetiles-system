#!/bin/bash

# Heroku Data Collection Script
# This script helps you collect your Heroku app data and database information

echo "🚀 HEROKU DATA COLLECTION TOOL"
echo "=============================="

# Check if Heroku CLI is installed
if ! command -v heroku &> /dev/null; then
    echo "❌ Heroku CLI not found!"
    echo "📥 Please install it from: https://devcenter.heroku.com/articles/heroku-cli"
    exit 1
fi

# Check if user is logged in
if ! heroku auth:whoami &> /dev/null; then
    echo "🔐 Please login to Heroku first:"
    heroku auth:login
fi

# Get app name
echo ""
read -p "📱 Enter your Heroku app name: " APP_NAME

if [ -z "$APP_NAME" ]; then
    echo "❌ App name is required!"
    exit 1
fi

echo ""
echo "🔍 Collecting data from Heroku app: $APP_NAME"
echo "============================================"

# Create collection directory
COLLECTION_DIR="../heroku-data-collection/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$COLLECTION_DIR"

echo "📁 Collection directory: $COLLECTION_DIR"

# 1. Get app configuration
echo ""
echo "⚙️  Collecting app configuration..."
heroku config -a $APP_NAME > "$COLLECTION_DIR/config-vars.txt"
heroku releases -a $APP_NAME > "$COLLECTION_DIR/releases.txt"
heroku ps -a $APP_NAME > "$COLLECTION_DIR/dynos.txt"

# 2. Get database information
echo "🗃️  Collecting database information..."
heroku pg:info -a $APP_NAME > "$COLLECTION_DIR/database-info.txt"

# 3. Get database URL
DATABASE_URL=$(heroku config:get DATABASE_URL -a $APP_NAME)
echo "DATABASE_URL=$DATABASE_URL" > "$COLLECTION_DIR/database-url.env"

# 4. Export database schema
echo "🏗️  Exporting database schema..."
heroku pg:psql -a $APP_NAME -c "\d+" > "$COLLECTION_DIR/database-schema.txt" 2>/dev/null

# 5. Get table list and row counts
echo "📊 Getting table statistics..."
heroku pg:psql -a $APP_NAME -c "
SELECT 
    schemaname,
    tablename, 
    attname, 
    n_distinct,
    correlation 
FROM pg_stats 
WHERE schemaname = 'public' 
ORDER BY tablename, attname;" > "$COLLECTION_DIR/table-stats.txt" 2>/dev/null

# 6. Get recent logs
echo "📋 Collecting recent logs..."
heroku logs --tail=false --num=1000 -a $APP_NAME > "$COLLECTION_DIR/recent-logs.txt"

# 7. Create data export script with the correct DATABASE_URL
cat > "$COLLECTION_DIR/export-production-data.js" << EOL
// Production data export script
// Run with: HEROKU_DATABASE_URL="$DATABASE_URL" node export-production-data.js

const fs = require('fs');
const { Sequelize } = require('sequelize');

const DATABASE_URL = process.env.HEROKU_DATABASE_URL || '$DATABASE_URL';

// Copy the heroku-data-export.js content here and run it
// This file contains your actual Heroku DATABASE_URL for easy export

console.log('🔗 Connecting to production database...');
console.log('💡 Make sure you have sequelize installed: npm install sequelize pg');
console.log('💡 Run the main export script with:');
console.log('   HEROKU_DATABASE_URL="$DATABASE_URL" node ../scripts/heroku-data-export.js');
EOL

echo ""
echo "✅ Data collection completed!"
echo ""
echo "📁 Files collected in: $COLLECTION_DIR"
echo "   - config-vars.txt (Environment variables)"
echo "   - database-info.txt (Database details)"
echo "   - database-url.env (Database connection)"
echo "   - database-schema.txt (Table structure)"
echo "   - table-stats.txt (Table statistics)"
echo "   - recent-logs.txt (Application logs)"
echo "   - export-production-data.js (Database export helper)"
echo ""
echo "🚀 NEXT STEPS:"
echo "=============="
echo "1. Set the DATABASE_URL environment variable:"
echo "   export HEROKU_DATABASE_URL=\"$DATABASE_URL\""
echo ""
echo "2. Run the data export script:"
echo "   cd backend && node scripts/heroku-data-export.js"
echo ""
echo "3. Import the data to local database:"
echo "   node scripts/heroku-data-import.js"
echo ""
echo "💡 TIP: Check the files in $COLLECTION_DIR for your production configuration"