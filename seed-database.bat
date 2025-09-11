@echo off
cd /d "%~dp0backend"
echo Seeding Fortune Tiles Database...
node seedData.js
echo.
echo Database seeding completed!
pause
