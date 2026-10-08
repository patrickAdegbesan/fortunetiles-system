@echo off
setlocal enableextensions
cd /d "%~dp0"
title Fortune Tiles

rem ============================================================
rem  Fortune Tiles - double-click to run.
rem  First time: needs internet once to set itself up.
rem  After that: starts instantly, no internet and no Node.js.
rem ============================================================

set "FORTUNE_TILES_DATA=%~dp0FortuneTilesData"
set "ELECTRON=%~dp0desktop-app\node_modules\electron\dist\electron.exe"

if exist "%ELECTRON%" if exist "backend\public\index.html" if exist "backend\node_modules\express" goto launch

echo.
echo  ==========================================
echo   Fortune Tiles - first-time setup
echo   This needs an internet connection and
echo   takes several minutes. Please wait.
echo  ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 goto installnode

:havenode
echo [1/4] Installing components...
call npm run install:all
if errorlevel 1 goto fail

echo.
echo [2/4] Building the application...
call npm run build:app
if errorlevel 1 goto fail

echo.
echo [3/4] Admin account
node backend\tools\setup-admin.js
if errorlevel 1 goto fail

echo.
echo [4/4] Cleaning up...
if exist "frontend\node_modules" rd /s /q "frontend\node_modules"

echo.
echo Setup complete. Starting Fortune Tiles...
goto launch

:installnode
echo Node.js is not installed. Trying to install it automatically...
where winget >nul 2>nul
if errorlevel 1 goto nonode
winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
set "PATH=%ProgramFiles%\nodejs;%PATH%"
where node >nul 2>nul
if errorlevel 1 goto nonode
goto havenode

:nonode
echo.
echo Could not install Node.js automatically.
echo Please install "Node.js LTS" from https://nodejs.org, then double-click START.bat again.
echo.
pause
exit /b 1

:fail
echo.
echo ================================================
echo  Setup failed. Take a photo or copy the messages
echo  above and send them back so it can be fixed.
echo  (Check that this computer is online, then run
echo   START.bat again - it continues where it stopped.)
echo ================================================
pause
exit /b 1

:launch
start "" "%ELECTRON%" "%~dp0desktop-app"
exit /b 0
