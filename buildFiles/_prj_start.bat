@echo off
setlocal

REM Get the current path of the batch file
set "current_path=%~dp0"

echo The current path of the batch file is: %current_path%

cd /d %current_path%

echo Starting countryChicken process...
call npm start
pause

REM Add a timeout to allow npm start to launch
timeout /t 10

REM Check the errorlevel
if errorlevel 1 (
  echo Error during pm2 start.
  pause
  exit /b 1
)
pause


