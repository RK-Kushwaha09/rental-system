@echo off
title RentManager Backend (Java Spring Boot)
echo ========================================================
echo   Starting RentManager Backend on http://localhost:8080
echo ========================================================
cd /d "%~dp0backend"
call mvnw.cmd spring-boot:run
pause
