@echo off
echo Running product types migration...
cd backend
node -e "require('./migrations/productTypesMigration')().catch(err => { console.error(err); process.exit(1); })"
if errorlevel 1 (
    echo Migration failed
    exit /b 1
) else (
    echo Migration completed successfully
    exit /b 0
)
