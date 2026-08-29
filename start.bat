@echo off
echo ==========================================
echo CKD Management System - Start Script
echo ==========================================
echo.

REM Check if Node.js is installed
node -v >nul 2>&1
if errorlevel 1 (
    echo Error: Node.js is not installed. Please install Node.js v16 or higher.
    exit /b 1
)

echo Node.js version: 
node -v
echo.

REM Setup Backend
echo Setting up Backend...
echo ---------------------
cd backend

if not exist "node_modules" (
    echo Installing backend dependencies...
    call npm install
) else (
    echo Backend dependencies already installed.
)

echo.
echo Starting Backend Server...
start "CKD Backend" cmd /k "npm start"

cd ..

REM Setup Frontend
echo.
echo Setting up Frontend...
echo ---------------------
cd app

if not exist "node_modules" (
    echo Installing frontend dependencies...
    call npm install
) else (
    echo Frontend dependencies already installed.
)

echo.
echo Starting Frontend Dev Server...
start "CKD Frontend" cmd /k "npm run dev"

cd ..

echo.
echo ==========================================
echo Servers Started!
echo ==========================================
echo.
echo Backend:  http://localhost:3001
echo Frontend: http://localhost:5173
echo.
echo Demo Accounts:
echo   Admin:     admin / admin123
echo   Doctor:    doctor1 / doctor123
echo   Nurse:     nurse1 / nurse123
echo   Patient:   patient1 / patient123
echo.
pause
