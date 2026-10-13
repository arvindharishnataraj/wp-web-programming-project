@echo off
echo ========================================================
echo   Starting GeoPulse 360 - Real-Time Intelligence Platform
echo ========================================================
cd /d "%~dp0"
if not exist node_modules (
  echo Installing dependencies...
  call npm install
)
echo Launching server on http://localhost:3000 ...
start http://localhost:3000
npm start
pause
