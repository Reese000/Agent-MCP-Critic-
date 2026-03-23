@echo off
TITLE MACO Swarm CLI Monitor
cd /d "%~dp0"

:RESTART
echo [%DATE% %TIME%] Starting MACO Swarm Graphical Monitor...
echo Press Ctrl+C to stop or 'q' inside the monitor to exit.

node --loader ts-node/esm src/monitor.ts

echo [%DATE% %TIME%] Monitor exited. Restarting in 5 seconds...
echo Press Any Key to restart immediately or Close this window to stop.
timeout /t 5
goto RESTART
