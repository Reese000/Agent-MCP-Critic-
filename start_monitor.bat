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

IF EXIST "dist\monitor.js" GOTO RUN_DIST
IF EXIST "src\monitor.ts" GOTO RUN_TS

echo [ERROR] Monitor files not found.
pause
exit /b 1

:RUN_DIST
echo [MONITOR] Running compiled version (dist/monitor.js)...
node dist/monitor.js %*
GOTO MONITOR_EXIT

:RUN_TS
echo [MONITOR] Running TS version via npx...
npx ts-node --esm src/monitor.ts %*
GOTO MONITOR_EXIT

:MONITOR_EXIT
if %ERRORLEVEL% NEQ 0 (
    echo [FATAL] Monitor exited with error code %ERRORLEVEL%.
    pause
)

echo.
echo [%DATE% %TIME%] Monitor process ended. Restarting in 5s...
timeout /t 5
goto RESTART
