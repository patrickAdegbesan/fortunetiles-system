@echo off
echo ==========================================
echo    Fortune Tiles Inventory Reset
echo ==========================================
echo.
echo This will reset ALL inventory to ZERO!
echo.
echo Press Ctrl+C to cancel, or
pause
echo.
echo Starting inventory reset...
cd /d "%~dp0backend"
node reset-inventory.js
echo.
echo Reset completed. Press any key to exit.
pause