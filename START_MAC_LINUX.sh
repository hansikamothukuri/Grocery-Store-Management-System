#!/bin/bash

echo ""
echo "  ================================================"
echo "   🛒  FreshMart - Grocery Store Management System"
echo "  ================================================"
echo ""

# ── Check Python ─────────────────────────────────────
if ! command -v python3 &> /dev/null; then
    echo "  [ERROR] Python 3 is not installed."
    echo "  Install it from: https://www.python.org/downloads/"
    exit 1
fi
echo "  [OK] Python found: $(python3 --version)"

# ── Create .env if missing ───────────────────────────
if [ ! -f ".env" ]; then
    echo ""
    echo "  [SETUP] .env not found. Let's configure your database."
    echo ""
    read -p "  MySQL Username (default: root): " DB_USER
    DB_USER=${DB_USER:-root}
    read -s -p "  MySQL Password: " DB_PASS
    echo ""
    read -p "  Database name (default: grocery_store_db): " DB_NAME
    DB_NAME=${DB_NAME:-grocery_store_db}

    cat > .env <<EOF
SECRET_KEY=freshmart-secret-key-change-in-production
DB_USERNAME=$DB_USER
DB_PASSWORD=$DB_PASS
DB_HOST=localhost
DB_PORT=3306
DB_NAME=$DB_NAME
EOF
    echo "  [OK] .env file created."
fi

# ── Create virtual environment ───────────────────────
if [ ! -d "venv" ]; then
    echo ""
    echo "  [SETUP] Creating virtual environment..."
    python3 -m venv venv
    echo "  [OK] Virtual environment created."
fi

# ── Activate venv ────────────────────────────────────
source venv/bin/activate

# ── Install dependencies ─────────────────────────────
echo ""
echo "  [SETUP] Installing/checking dependencies..."
pip install -r requirements.txt -q --disable-pip-version-check
echo "  [OK] Dependencies ready."

# ── Open browser ─────────────────────────────────────
echo ""
echo "  [OK] Starting FreshMart..."
echo "  [OK] Opening http://localhost:5000 ..."
echo ""
echo "  Login credentials: admin / admin123"
echo ""
echo "  Press Ctrl+C to stop the server."
echo "  ================================================"
echo ""

# Open browser after 3 seconds in background
(sleep 3 && open "http://localhost:5000" 2>/dev/null || xdg-open "http://localhost:5000" 2>/dev/null) &

# Run Flask
python app.py
