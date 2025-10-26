@echo off
REM CafeSync Quick Start Script for Windows
REM This script will set up and run CafeSync for your team

echo 🚀 CafeSync Quick Start Script
echo ================================

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    echo    Download from: https://nodejs.org/
    pause
    exit /b 1
)

REM Check if Git is installed
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Git is not installed. Please install Git first.
    echo    Download from: https://git-scm.com/
    pause
    exit /b 1
)

echo ✅ Prerequisites check passed

REM Install root dependencies
echo 📦 Installing root dependencies...
npm install

REM Install server dependencies
echo 📦 Installing server dependencies...
cd server
npm install
cd ..

REM Install client dependencies
echo 📦 Installing client dependencies...
cd client
npm install
cd ..

REM Copy environment file if it doesn't exist
if not exist .env (
    echo 📝 Creating environment file...
    copy env.example .env
    echo ✅ Environment file created. You may need to edit .env with your settings.
)

echo.
echo 🎉 Setup complete!
echo.
echo To start the application:
echo 1. Open Command Prompt 1 and run: cd server ^&^& npm start
echo 2. Open Command Prompt 2 and run: cd client ^&^& npm start
echo.
echo Then visit: http://localhost:3000
echo.
echo For detailed instructions, see: TEAM_SETUP_GUIDE.md
pause
