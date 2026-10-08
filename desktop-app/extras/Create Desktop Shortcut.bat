@echo off
setlocal
rem Creates a "Fortune Tiles" shortcut (with the app icon) on your Desktop.
rem Keep this file next to "Fortune Tiles.exe". If you move the folder later, run it again.
set "APPDIR=%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$d=[Environment]::GetFolderPath('Desktop'); $s=(New-Object -ComObject WScript.Shell).CreateShortcut($d+'\Fortune Tiles.lnk'); $s.TargetPath=$env:APPDIR+'Fortune Tiles.exe'; $s.WorkingDirectory=$env:APPDIR; $s.IconLocation=$env:APPDIR+'Fortune Tiles.exe,0'; $s.Description='Fortune Tiles'; $s.Save()"
if errorlevel 1 (
  echo.
  echo Could not create the shortcut. You can do it by hand:
  echo right-click "Fortune Tiles.exe" - Send to - Desktop ^(create shortcut^).
) else (
  echo.
  echo Done. A "Fortune Tiles" shortcut is now on your Desktop.
)
echo.
pause
