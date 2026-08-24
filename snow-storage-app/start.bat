@echo off
setlocal
REM Snow Storage Management System - run the server (Windows)
REM Run install.bat once first, then double-click this file each time.
REM Closing this window stops the server, so keep it minimized to keep running.

echo Checking this PC's network address...
echo Use the "IPv4" address below from another PC's browser, like:
echo   http://THAT_IP_ADDRESS:4000
echo.
ipconfig | findstr /i "IPv4"
echo.

cd /d "%~dp0backend"
set PORT=4000
echo Starting server. Do not close this window while you are using the app.
call npm start
pause
