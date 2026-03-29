@echo off
TITLE MACO Swarm - Agent Detail View
cd /d "%~dp0"

echo [MONITOR] Launching Unified Monitor in Detail View mode...
call start_monitor.bat --details
