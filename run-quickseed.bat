@echo off
cd /d "%~dp0backend"
echo Running quick database seed...
node quickSeed.js
echo.
echo Quick seed completed! Press any key to close.
pause
