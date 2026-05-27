@echo off
cd /d "%~dp0"
echo Updating WallDrop gallery...

echo.
echo === Trying Node.js build (for Vercel compatibility) ===
where node >nul 2>&1
if not errorlevel 1 (
  if exist "Webpage\generate-gallery.js" (
    cd Webpage
    node generate-gallery.js
    if not errorlevel 1 node generate-sitemap.js
    cd ..
    if not errorlevel 1 (
      echo Node.js build successful.
      goto done
    )
  )
)

echo.
echo === Falling back to Python sync.py ===
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

:done
echo.
echo Done. Refresh your browser or run push-github.bat for Vercel deployment.
echo.
pause
