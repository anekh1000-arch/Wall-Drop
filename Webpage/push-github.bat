@echo off
cd /d "%~dp0"
set GIT=C:\Program Files\Git\cmd\git.exe
if not exist "%GIT%" set GIT=git

echo === WallDrop: sync gallery ===
set PYTHONIOENCODING=utf-8
python sync.py 2>nul
if errorlevel 1 py sync.py
if errorlevel 1 (
  echo sync failed - fix Python first
  pause
  exit /b 1
)

echo.
echo === Git commit and push ===
"%GIT%" add -A
"%GIT%" diff --cached --quiet
if errorlevel 1 (
  "%GIT%" commit -m "Update WallDrop site and wallpapers"
  if errorlevel 1 echo Commit failed.
) else (
  echo Nothing new to commit.
)
"%GIT%" push origin main
if errorlevel 1 (
  echo.
  echo Push failed. Check your GitHub credentials or run: git push -u origin main
)

echo.
pause
