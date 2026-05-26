@echo off
cd /d "%~dp0"
echo Updating WallDrop gallery...
if exist "Webpage\sync.py" (
  python Webpage\sync.py 2>nul
  if errorlevel 1 py Webpage\sync.py
) else (
  python sync.py 2>nul
  if errorlevel 1 py sync.py
)
if errorlevel 1 (
  echo.
  echo Python not found. Install from https://www.python.org/ and enable "Add to PATH"
  echo Or run manually:  py sync.py
  pause
  exit /b 1
)
echo.
echo Done. Refresh http://localhost:8080 in your browser.
echo.
pause
