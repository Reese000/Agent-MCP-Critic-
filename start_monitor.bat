@echo off
TITLE MACO Swarm CLI Monitor
cd /d "%~dp0"

echo [DEBUG] Current Directory: %CD%
echo [DEBUG] Searching for monitor: src/monitor.ts or dist/monitor.js

timeout /t 1 /nobreak > nul
echo [SYSTEM] Pinning Monitor to Top...
powershell -ExecutionPolicy Bypass -File scripts\pin_monitor.ps1 || echo [WARNING] Pinning failed.

:RESTART
echo [%DATE% %TIME%] Starting MACO Swarm Graphical Monitor...

IF EXIST "dist\monitor.js" (
    echo [MONITOR] Running compiled version...
    node dist/monitor.js
) ELSE (
    echo [MONITOR] Running TS version via npx...
    npx ts-node --esm src/monitor.ts
)

if %ERRORLEVEL% NEQ 0 (
    echo [FATAL] Monitor exited with error code %ERRORLEVEL%.
    pause
)

echo.
echo [%DATE% %TIME%] Finalizing turn. Restarting in 5s...
timeout /t 5
goto RESTART
