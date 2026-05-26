@echo off
cd /d "%~dp0"
echo Updating WallDrop gallery...

where node >nul 2>&1
if not errorlevel 1 (
  node generate-gallery.js
  if not errorlevel 1 goto done
)

python sync.py 2>nul
if errorlevel 1 py sync.py
if errorlevel 1 (
  echo.
  echo Install Node.js https://nodejs.org/ or Python https://www.python.org/
  pause
  exit /b 1
)

:done
echo.
echo Done. Refresh your browser or push to Netlify.
echo.
pause
