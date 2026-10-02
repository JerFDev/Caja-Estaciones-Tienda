@echo off
title Tienda Creativa - Gestion de Ventas y Emprendimientos
color 0A
echo ========================================================
echo   TIENDA CREATIVA - MUNICIPALIDAD (SISTEMA OFFLINE)
echo ========================================================
echo.
echo Iniciando base de datos MySQL y servidor API...
cd /d "%~dp0"

REM Iniciar backend en segundo plano si no esta corriendo
start /b cmd /c "npx.cmd tsx server/index.ts"

timeout /t 2 /nobreak >nul

echo Iniciando interfaz de usuario...
start http://localhost:5173

REM Iniciar frontend en modo desarrollo
npm.cmd run dev:client
