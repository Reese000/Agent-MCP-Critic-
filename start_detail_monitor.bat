@echo off
TITLE MACO Swarm - Agent Detail View
cd /d "%~dp0"

:RESTART
echo [%DATE% %TIME%] Starting Agent Detail Streaming Monitor...

IF EXIST "dist\detail_monitor.js" (
    node dist/detail_monitor.js
) ELSE (
    npx ts-node --esm src/detail_monitor.ts
)

echo.
echo [%DATE% %TIME%] Detail Monitor exited. Restarting in 5 seconds...
timeout /t 5
goto RESTART
