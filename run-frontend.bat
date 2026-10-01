@echo off
title RentManager Frontend (React + Vite)
echo ========================================================
echo   Starting RentManager Frontend on http://localhost:5173
echo ========================================================
cd /d "%~dp0frontend"

if not exist "node_modules\" (
    echo Installing npm dependencies... This will take a moment on first run.
    call npm install
)

call npm run dev
pause
