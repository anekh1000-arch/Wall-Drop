@echo off
cd /d "%~dp0"
echo === WallDrop: sync gallery ===
if exist "Webpage\sync.py" (
  python Webpage\sync.py 2>nul
  if errorlevel 1 py Webpage\sync.py
) else (
  python sync.py 2>nul
  if errorlevel 1 py sync.py
)
if errorlevel 1 (
  echo sync failed - fix Python first
  pause
  exit /b 1
)

where git >nul 2>&1
if errorlevel 1 (
  echo.
  echo Git is not installed. Install from https://git-scm.com/download/win
  echo Then run this file again.
  pause
  exit /b 1
)

echo.
echo === Git commit ===
git add -A
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "Update WallDrop site and wallpapers"
  if errorlevel 1 echo Commit failed.
) else (
  echo Nothing new to commit.
)

echo.
echo === Push to GitHub ===
git push origin main
if errorlevel 1 (
  echo.
  echo Push failed. First time? Run:
  echo   git remote add origin YOUR_REPO_URL
  echo   git branch -M main
  echo   git push -u origin main
)

echo.
pause
