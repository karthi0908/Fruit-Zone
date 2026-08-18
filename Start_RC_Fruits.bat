@echo off
title RC Fruits Server Manager
color 0b

echo.
echo ===================================================
echo     RC Fruits - Starting Server Manager
echo ===================================================
echo.

cd /d "%~dp0"

echo Checking if Java server is already running...
netstat -ano | findstr :8080 | findstr LISTENING >nul
if not errorlevel 1 (
    echo Java Backend is already active on port 8080! Launching app...
    start http://localhost:8080/login.html
    exit
)

echo Starting up Java Backend...
start "RC Fruits Backend" /B java -jar target\tracker-0.0.1-SNAPSHOT.jar

echo Waiting for backend server on port 8080...

:wait_loop
ping 127.0.0.1 -n 2 >nul
netstat -ano | findstr :8080 | findstr LISTENING >nul
if errorlevel 1 (
    goto wait_loop
)

echo.
echo Server is ready! Launching browser...
start http://localhost:8080/login.html
exit
