# HEROKU DATA COLLECTION TOOL
# Simple version without special characters

Write-Host "HEROKU DATA COLLECTION TOOL" -ForegroundColor Green
Write-Host "============================" -ForegroundColor Green

# Check if Heroku CLI is installed
if (!(Get-Command heroku -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Heroku CLI not found!" -ForegroundColor Red
    Write-Host "Please install it from: https://devcenter.heroku.com/articles/heroku-cli" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if user is logged in
try {
    $null = heroku auth:whoami 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Please login to Heroku first..." -ForegroundColor Yellow
        heroku auth:login
    }
} catch {
    Write-Host "Please login to Heroku first..." -ForegroundColor Yellow
    heroku auth:login
}

# Get app name
Write-Host ""
$APP_NAME = Read-Host "Enter your Heroku app name"

if ([string]::IsNullOrEmpty($APP_NAME)) {
    Write-Host "ERROR: App name is required!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Collecting data from Heroku app: $APP_NAME" -ForegroundColor Green
Write-Host "=========================================="

# Create collection directory
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$COLLECTION_DIR = "heroku-data-collection\$timestamp"
New-Item -ItemType Directory -Path $COLLECTION_DIR -Force | Out-Null

Write-Host "Collection directory: $COLLECTION_DIR" -ForegroundColor Cyan

# 1. Get app configuration
Write-Host ""
Write-Host "Collecting app configuration..." -ForegroundColor Yellow
heroku config -a $APP_NAME | Out-File -FilePath "$COLLECTION_DIR\config-vars.txt" -Encoding UTF8
heroku releases -a $APP_NAME | Out-File -FilePath "$COLLECTION_DIR\releases.txt" -Encoding UTF8
heroku ps -a $APP_NAME | Out-File -FilePath "$COLLECTION_DIR\dynos.txt" -Encoding UTF8

# 2. Get database information
Write-Host "Collecting database information..." -ForegroundColor Yellow
heroku pg:info -a $APP_NAME | Out-File -FilePath "$COLLECTION_DIR\database-info.txt" -Encoding UTF8

# 3. Get database URL
Write-Host "Getting database URL..." -ForegroundColor Yellow
$DATABASE_URL = heroku config:get DATABASE_URL -a $APP_NAME
"HEROKU_DATABASE_URL=$DATABASE_URL" | Out-File -FilePath "$COLLECTION_DIR\database-url.env" -Encoding UTF8

# 4. Get recent logs
Write-Host "Collecting recent logs..." -ForegroundColor Yellow
heroku logs --tail=false --num=1000 -a $APP_NAME | Out-File -FilePath "$COLLECTION_DIR\recent-logs.txt" -Encoding UTF8

# 5. Create export batch file
$exportBat = @"
@echo off
title Heroku Data Export

echo ===============================
echo    HEROKU DATA EXPORT
echo ===============================
echo.

echo Setting environment variable...
set "HEROKU_DATABASE_URL=$DATABASE_URL"

echo.
echo Running export script...
cd /d "%~dp0..\..\backend"

echo.
echo Make sure you have the required packages:
echo npm install sequelize pg
echo.

node scripts\heroku-data-export.js

echo.
echo Export completed! Check the backend\exports folder.
echo.
pause
"@

$exportBat | Out-File -FilePath "$COLLECTION_DIR\run-data-export.bat" -Encoding ASCII

# 6. Create import batch file  
$importBat = @"
@echo off
title Import Heroku Data

echo ===============================
echo    IMPORT HEROKU DATA
echo ===============================
echo.

echo This will import the exported Heroku data into your local database.
echo WARNING: This will overwrite your local data!
echo.
pause

cd /d "%~dp0..\..\backend"
node scripts\heroku-data-import.js

echo.
echo Import completed!
pause
"@

$importBat | Out-File -FilePath "$COLLECTION_DIR\run-data-import.bat" -Encoding ASCII

# 7. Create instructions file
$instructions = @"
HEROKU DATA COLLECTION RESULTS
==============================

Collection Date: $(Get-Date)
Heroku App: $APP_NAME

FILES COLLECTED:
- config-vars.txt (Environment variables)
- database-info.txt (Database details)  
- database-url.env (Database connection string)
- releases.txt (App releases history)
- dynos.txt (Current dynos status)
- recent-logs.txt (Recent application logs)
- run-data-export.bat (Export database data)
- run-data-import.bat (Import data locally)

NEXT STEPS:
===========

1. EXPORT DATA FROM HEROKU:
   - Double-click 'run-data-export.bat'
   - This will download all your production data

2. IMPORT DATA TO LOCAL DATABASE:  
   - Make sure your local database is running
   - Double-click 'run-data-import.bat'
   - This will import the data to your local system

3. VERIFY IMPORT:
   - Check your local application
   - All users, products, sales, etc. should be there

MANUAL COMMANDS (if batch files don't work):
==========================================

Export data:
set "HEROKU_DATABASE_URL=$DATABASE_URL"
cd backend
node scripts\heroku-data-export.js

Import data:
cd backend  
node scripts\heroku-data-import.js

TROUBLESHOOTING:
===============
- Make sure Node.js is installed
- Make sure you have: npm install sequelize pg
- Make sure your local PostgreSQL is running
- Check that local database exists: fortunetiles_db

Your production DATABASE_URL:
$DATABASE_URL
"@

$instructions | Out-File -FilePath "$COLLECTION_DIR\README.txt" -Encoding UTF8

Write-Host ""
Write-Host "SUCCESS: Data collection completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Files saved to: $COLLECTION_DIR" -ForegroundColor Cyan
Write-Host "- Configuration and logs collected" -ForegroundColor White  
Write-Host "- Database connection URL saved" -ForegroundColor White
Write-Host "- Export/Import scripts created" -ForegroundColor White
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Green
Write-Host "1. Go to folder: $COLLECTION_DIR" -ForegroundColor Yellow
Write-Host "2. Read the README.txt file" -ForegroundColor Yellow  
Write-Host "3. Run 'run-data-export.bat' to download your data" -ForegroundColor Yellow
Write-Host "4. Run 'run-data-import.bat' to import to local database" -ForegroundColor Yellow
Write-Host ""
Write-Host "Opening collection folder..." -ForegroundColor Cyan
Start-Process explorer.exe -ArgumentList $COLLECTION_DIR

Write-Host ""
Write-Host "Collection completed! Check the folder that just opened." -ForegroundColor Green
Read-Host "Press Enter to exit"