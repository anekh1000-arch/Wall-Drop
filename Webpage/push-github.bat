@echo off
cd /d "%~dp0"
set GIT=C:\Program Files\Git\cmd\git.exe
if not exist "%GIT%" set GIT=git
set REPO=D:\Wall-Drop

echo === WallDrop: sync gallery ===
set PYTHONIOENCODING=utf-8
python sync.py 2>nul
if errorlevel 1 py sync.py
if errorlevel 1 (
  echo sync failed - fix Python first
  pause
  exit /b 1
)

if not exist "%REPO%\.git" (
  echo.
  echo Repo folder not found: %REPO%
  echo Clone once: git clone https://github.com/anekh1000-arch/Wall-Drop.git D:\Wall-Drop
  pause
  exit /b 1
)

echo.
echo === Copy site into repo ===
robocopy "%~dp0" "%REPO%\Webpage" /E /XD .git __pycache__ /XF push-github.bat /NFL /NDL /NJH /NJS /nc /ns /np >nul

echo.
echo === Git commit and push ===
cd /d "%REPO%"
"%GIT%" add -A
"%GIT%" -c user.email=walldrop@local -c user.name="WallDrop Owner" commit -m "Update WallDrop site and wallpapers"
if errorlevel 1 echo Nothing new to commit.
"%GIT%" push
if errorlevel 1 (
  echo.
  echo Push failed. Sign in to GitHub or run: git push -u origin main
)

echo.
pause
