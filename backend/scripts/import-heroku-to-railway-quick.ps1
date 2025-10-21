# Quick PowerShell wrapper for Heroku -> Railway import
# Usage: Open PowerShell in project root and run:
#   $env:RAILWAY_DATABASE_URL = "<railway connection string>"
#   node .\backend\scripts\import-heroku-to-railway-quick.js

Write-Host "This script is a wrapper. The Node script will prompt for confirmation before performing the import.`n" -ForegroundColor Yellow
Write-Host "Make sure pg_dump and psql are installed and in PATH." -ForegroundColor Cyan

if (-not (Get-Command pg_dump -ErrorAction SilentlyContinue)) {
  Write-Host "pg_dump not found in PATH. Install PostgreSQL client tools and try again." -ForegroundColor Red
  exit 1
}
if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
  Write-Host "psql not found in PATH. Install PostgreSQL client tools and try again." -ForegroundColor Red
  exit 1
}

# Run the Node importer
node .\backend\scripts\import-heroku-to-railway-quick.js
