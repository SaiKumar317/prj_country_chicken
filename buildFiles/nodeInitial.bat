@echo off
cd /d 

echo Starting nodejs Initial process...

echo Starting nodejs pm2 process...

call npm install pm2 -g
echo Starting nodejs pm2-windows-startup process...

call npm install pm2-windows-startup -g

echo Starting nodejs pm2-startup process...
call pm2-startup install

REM Check the errorlevel
if errorlevel 1 (
  echo Error during pm2 start.
  pause
  exit /b 1
)
pause
