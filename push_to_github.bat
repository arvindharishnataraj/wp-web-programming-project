@echo off
echo ========================================================
echo   Push GeoPulse 360 to GitHub
echo ========================================================
cd /d "%~dp0"

set /p REPO_URL="Enter your GitHub Repository URL (e.g. https://github.com/arvindharishnataraj/geopulse-360.git): "

if "%REPO_URL%"=="" (
  echo Error: Repository URL cannot be empty.
  pause
  exit /b
)

echo Adding remote origin...
git remote remove origin 2>nul
git remote add origin %REPO_URL%
git branch -M main

echo Pushing code to GitHub...
git push -u origin main

echo Done!
pause
