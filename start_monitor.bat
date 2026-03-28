@echo off
TITLE MACO Swarm CLI Monitor
cd /d "%~dp0"

:RESTART
echo [%DATE% %TIME%] Starting MACO Swarm Graphical Monitor...
echo Mode: Checking for compiled assets...

IF EXIST "dist\monitor.js" (
    echo [MONITOR] Running compiled version [dist\monitor.js]...
    node dist/monitor.js
) ELSE (
    echo [MONITOR] Compiled version not found. Running TS version via npx...
    npx ts-node --esm src/monitor.ts
)

echo.
echo [%DATE% %TIME%] Monitor exited with code %ERRORLEVEL%. 
echo Restarting in 5 seconds [Press Ctrl+C to cancel]...
timeout /t 5
goto RESTART
