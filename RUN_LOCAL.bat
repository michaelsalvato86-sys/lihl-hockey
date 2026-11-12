@echo off
rem Runs the whole LIHL Hockey game + multiplayer server from this PC (no Fly needed).
rem Play on this PC:  http://localhost:8090   |  Friends on your Tailscale network: http://100.91.131.20:8090
cd /d "%~dp0server"
set LIHL_WEB=%~dp0
set PORT=8090
echo Starting LIHL Hockey on port 8090 ... close this window to stop it.
node server.js
