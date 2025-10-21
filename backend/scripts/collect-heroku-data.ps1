# HEROKU DATA COLLECTION TOOL
# ==========================

# Check if Heroku CLI is installed
if (!(Get-Command heroku -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Heroku CLI not found!" -ForegroundColor Red
    Write-Host "📥 Please install it from: https://devcenter.heroku.com/articles/heroku-cli" -ForegroundColor Yellow
    exit 1
}

# Check if user is logged in
try {
    $null = heroku auth:whoami 2>&1
} catch {
    Write-Host "🔐 Please login to Heroku first:" -ForegroundColor Yellow
    heroku auth:login
}

# Get app name
Write-Host ""
$APP_NAME = Read-Host "📱 Enter your Heroku app name"

if ([string]::IsNullOrEmpty($APP_NAME)) {
    Write-Host "❌ App name is required!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🔍 Collecting data from Heroku app: $APP_NAME" -ForegroundColor Green
Write-Host "============================================"

# Create collection directory
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$COLLECTION_DIR = "..\heroku-data-collection\$timestamp"
New-Item -ItemType Directory -Path $COLLECTION_DIR -Force | Out-Null

Write-Host "📁 Collection directory: $COLLECTION_DIR" -ForegroundColor Cyan

# 1. Get app configuration
Write-Host ""
Write-Host "⚙️  Collecting app configuration..." -ForegroundColor Yellow
heroku config -a $APP_NAME | Out-File -FilePath "$COLLECTION_DIR\config-vars.txt" -Encoding UTF8
heroku releases -a $APP_NAME | Out-File -FilePath "$COLLECTION_DIR\releases.txt" -Encoding UTF8
heroku ps -a $APP_NAME | Out-File -FilePath "$COLLECTION_DIR\dynos.txt" -Encoding UTF8

# 2. Get database information
Write-Host "🗃️  Collecting database information..." -ForegroundColor Yellow
heroku pg:info -a $APP_NAME | Out-File -FilePath "$COLLECTION_DIR\database-info.txt" -Encoding UTF8

# 3. Get database URL
$DATABASE_URL = heroku config:get DATABASE_URL -a $APP_NAME
"DATABASE_URL=$DATABASE_URL" | Out-File -FilePath "$COLLECTION_DIR\database-url.env" -Encoding UTF8

# 4. Export database schema
Write-Host "🏗️  Exporting database schema..." -ForegroundColor Yellow
try {
    heroku pg:psql -a $APP_NAME -c "\d+" 2>$null | Out-File -FilePath "$COLLECTION_DIR\database-schema.txt" -Encoding UTF8
} catch {
    Write-Host "   ⚠️  Could not export schema (this is normal)" -ForegroundColor Yellow
}

# 5. Get recent logs
Write-Host "📋 Collecting recent logs..." -ForegroundColor Yellow
heroku logs --tail=false --num=1000 -a $APP_NAME | Out-File -FilePath "$COLLECTION_DIR\recent-logs.txt" -Encoding UTF8

# 6. Create PowerShell export script
$exportScript = @"
# PowerShell Data Export Script
# Run with: `$env:HEROKU_DATABASE_URL="$DATABASE_URL"; node ..\scripts\heroku-data-export.js

Write-Host "🚀 HEROKU DATA EXPORT INSTRUCTIONS" -ForegroundColor Green
Write-Host "=================================="
Write-Host ""
Write-Host "1. Set environment variable:" -ForegroundColor Yellow
Write-Host "   `$env:HEROKU_DATABASE_URL=`"$DATABASE_URL`""
Write-Host ""
Write-Host "2. Run export script:" -ForegroundColor Yellow
Write-Host "   cd backend"
Write-Host "   node scripts\heroku-data-export.js"
Write-Host ""
Write-Host "3. Import to local database:" -ForegroundColor Yellow
Write-Host "   node scripts\heroku-data-import.js"
Write-Host ""
Write-Host "Your DATABASE_URL is saved in: $COLLECTION_DIR\database-url.env" -ForegroundColor Cyan
"@

$exportScript | Out-File -FilePath "$COLLECTION_DIR\export-instructions.ps1" -Encoding UTF8

# 7. Create batch file for easy execution
$batchScript = @"
@echo off
echo 🚀 HEROKU DATA EXPORT
echo ====================
echo.
echo Setting environment variable...
set HEROKU_DATABASE_URL=$DATABASE_URL

echo Running export script...
cd /d "%~dp0..\backend"
node scripts\heroku-data-export.js

echo.
echo ✅ Export completed! Check the exports folder.
pause
"@

$batchScript | Out-File -FilePath "$COLLECTION_DIR\run-export.bat" -Encoding ASCII

Write-Host ""
Write-Host "✅ Data collection completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📁 Files collected in: $COLLECTION_DIR" -ForegroundColor Cyan
Write-Host "   - config-vars.txt (Environment variables)"
Write-Host "   - database-info.txt (Database details)"
Write-Host "   - database-url.env (Database connection)"
Write-Host "   - database-schema.txt (Table structure)"
Write-Host "   - recent-logs.txt (Application logs)"
Write-Host "   - export-instructions.ps1 (PowerShell instructions)"
Write-Host "   - run-export.bat (Easy export execution)"
Write-Host ""
Write-Host "🚀 NEXT STEPS:" -ForegroundColor Green
Write-Host "=============="
Write-Host "1. Double-click 'run-export.bat' to export your data" -ForegroundColor Yellow
Write-Host ""
Write-Host "   OR manually run:" -ForegroundColor Yellow
Write-Host "   `$env:HEROKU_DATABASE_URL=`"$DATABASE_URL`"" -ForegroundColor White
Write-Host "   cd backend" -ForegroundColor White
Write-Host "   node scripts\heroku-data-export.js" -ForegroundColor White
Write-Host ""
Write-Host "2. Import data to local database:" -ForegroundColor Yellow
Write-Host "   node scripts\heroku-data-import.js" -ForegroundColor White
Write-Host ""
Write-Host "TIP: All your production configuration is saved in $COLLECTION_DIR" -ForegroundColor Cyan