@echo off
REM Chronos Study Timer - Setup Script for Windows
REM This script installs all dependencies and sets up the project

echo ========================================
echo      Chronos Study Timer Setup
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)

for /f "tokens=1,2,3 delims=." %%a in ('node -v') do (
    set NODE_MAJOR=%%a
)
set NODE_MAJOR=%NODE_MAJOR:~1%

echo [OK] Node.js detected
echo.

REM Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm is not installed!
    pause
    exit /b 1
)

echo [OK] npm detected
echo.

REM Install root dependencies
echo [1/3] Installing root dependencies...
call npm install
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to install root dependencies
    pause
    exit /b 1
)
echo.

REM Install client dependencies
echo [2/3] Installing client dependencies...
cd client
call npm install
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to install client dependencies
    pause
    exit /b 1
)
cd ..
echo.

REM Install server dependencies
echo [3/3] Installing server dependencies...
cd server
call npm install
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to install server dependencies
    pause
    exit /b 1
)
cd ..
echo.

echo ========================================
echo      Setup Complete!
echo ========================================
echo.
echo To start the application, run:
echo.
echo   npm run dev
echo.
echo This will start:
echo   * Frontend at http://localhost:5173
echo   * Backend at http://localhost:3001
echo.
echo Happy tracking!
echo.
pause
