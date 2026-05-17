@echo off
title FreshMart - Grocery Store Management System
color 0A

echo.
echo  ================================================
echo   🛒  FreshMart - Grocery Store Management System
echo  ================================================
echo.

:: ── Check Python ────────────────────────────────────
python --version >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Python is not installed or not in PATH.
    echo  Please download it from: https://www.python.org/downloads/
    echo  Make sure to check "Add Python to PATH" during install.
    pause
    exit /b
)
echo  [OK] Python found.

:: ── Create .env if missing ───────────────────────────
if not exist ".env" (
    echo.
    echo  [SETUP] .env file not found. Creating one now...
    echo  Please enter your MySQL details:
    echo.
    set /p DB_USER="  MySQL Username (default: root): "
    if "!DB_USER!"=="" set DB_USER=root
    set /p DB_PASS="  MySQL Password: "
    set /p DB_NAME="  Database name (default: grocery_store_db): "
    if "!DB_NAME!"=="" set DB_NAME=grocery_store_db

    (
        echo SECRET_KEY=freshmart-secret-key-change-in-production
        echo DB_USERNAME=!DB_USER!
        echo DB_PASSWORD=!DB_PASS!
        echo DB_HOST=localhost
        echo DB_PORT=3306
        echo DB_NAME=!DB_NAME!
    ) > .env
    echo  [OK] .env file created.
)

:: ── Create virtual environment ───────────────────────
if not exist "venv\" (
    echo.
    echo  [SETUP] Creating virtual environment...
    python -m venv venv
    echo  [OK] Virtual environment created.
)

:: ── Activate venv ────────────────────────────────────
call venv\Scripts\activate.bat

:: ── Install dependencies ─────────────────────────────
echo.
echo  [SETUP] Installing/checking dependencies...
pip install -r requirements.txt -q --disable-pip-version-check
echo  [OK] Dependencies ready.

:: ── Open browser after 3 seconds ────────────────────
echo.
echo  [OK] Starting FreshMart...
echo  [OK] Opening http://localhost:5000 in your browser...
echo.
echo  Login: admin / admin123
echo.
echo  Press Ctrl+C to stop the server.
echo  ================================================
echo.

:: Open browser with a delay
start "" timeout /t 3 /nobreak >nul && start http://localhost:5000

:: Run Flask
python app.py

pause
