@echo off
title RentManager Pro Launcher
echo ========================================================
echo   Launching RentManager Pro (Backend + Frontend)
echo ========================================================
start "RentManager Backend (Java)" cmd /c "%~dp0run-backend.bat"
timeout /t 5 /nobreak >nul
start "RentManager Frontend (React)" cmd /c "%~dp0run-frontend.bat"
echo Services launched! Open http://localhost:5173 in your browser.
pause
