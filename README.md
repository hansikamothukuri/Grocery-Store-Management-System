# 🛒 FreshMart — Grocery Store Management System

## Introduction
FreshMart is a modern grocery store management app built with **Flask**, **MySQL**, and **Bootstrap**. It provides a complete small-store workflow including login, product management, inventory tracking, POS billing, order history, and analytics.

This project is ideal for a grocery shop or retail store owner who wants a compact desktop-style dashboard for daily sales and inventory control.

## Tech Stack
- Python 3.x
- Flask
- Flask-Login
- Flask-SQLAlchemy
- MySQL / MariaDB
- PyMySQL
- Bootstrap 5
- JavaScript (vanilla)
- HTML / CSS

## Core Features
- Secure admin login with profile and password update
- Product management with categories, stock, and image upload
- Inventory tracking and restock support
- POS billing with cart controls, tax, and discounts
- Order history, search, filters, and export CSV
- Dashboard analytics with revenue, orders, low stock alerts
- Default data seeding for admin and categories

## Workflow
1. Start the app and log in with the admin user.
2. Add product categories and products, including stock levels.
3. Use the Billing page to create customer orders and process payments.
4. Orders automatically deduct stock and save order history.
5. Use Order History to filter by date, status, or search terms.
6. Export filtered order reports to CSV from the order history screen.
7. Manage user profile and update the default admin password.

## Project Structure
```
grocery_store/
├── app.py                  # Flask application factory and startup
├── requirements.txt        # Python dependencies
├── .env.example            # Environment variables template
├── database/
│   ├── db.py               # SQLAlchemy init, table creation, data seeding
│   └── schema.sql          # Database schema reference
├── models/
│   ├── user.py             # User model
│   ├── category.py         # Category model
│   ├── product.py          # Product model
│   ├── inventory.py        # Inventory model
│   └── order.py            # Order and OrderItem models
├── routes/
│   ├── auth.py             # Login, logout, profile routes
│   ├── dashboard.py        # Dashboard and analytics routes
│   ├── products.py         # Product and inventory API routes
│   └── orders.py           # Orders, history, invoice, export routes
├── templates/
│   ├── base.html
│   ├── auth/
│   ├── dashboard/
│   ├── products/
│   ├── orders/
│   └── errors/
└── static/
    ├── css/
    ├── js/
    └── uploads/
```

## Setup Instructions
### Prerequisites
- Python 3.10+
- MySQL 8.0+ / MariaDB
- Git

### Install
```bash
cd grocery_store
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### Database Setup
Create the database in MySQL:
```sql
CREATE DATABASE grocery_store_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Environment Configuration
Copy the environment template and update the values:
```bash
copy .env.example .env
```
Set values in `.env`:
```text
SECRET_KEY=your-secret-key
DB_USERNAME=root
DB_PASSWORD=your_mysql_password
DB_HOST=localhost
DB_PORT=3306
DB_NAME=grocery_store_db
```

### Run the App
```bash
python app.py
```
Access the app at `http://localhost:5000`.

## Default Login
- Username: `admin`
- Password: `admin123`

> Change the default password immediately after first login.

## API Overview
- `GET /api/orders` — list orders with filters
- `GET /api/orders/export` — export filtered orders to CSV
- `POST /api/orders` — create an order
- `POST /api/orders/<id>/cancel` — cancel an order
- `GET /api/products` — list products
- `POST /api/products` — add a product
- `GET /api/categories` — list categories
- `POST /api/categories` — add a category

## Database Schema
- `users`: authentication and admin users
- `categories`: product categories
- `products`: item catalog with prices and barcodes
- `inventory`: stock quantity and low-stock alert
- `orders`: saved order transactions
- `order_items`: order line items

## Notes
- The app auto-creates tables and seeds default data on first run.
- The export feature generates a CSV using the current order filters.
- Keep `.env` secrets out of version control.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3, Flask 3.0 |
| Database | MySQL 8 |
| ORM | SQLAlchemy 2.0 via Flask-SQLAlchemy |
| Auth | Flask-Login + Werkzeug password hashing |
| Frontend | HTML5, CSS3, Bootstrap 5.3, Vanilla JS |
| Charts | Chart.js 4 |
| Fonts | Plus Jakarta Sans, Space Mono |

---

## 🚀 Production Deployment (Gunicorn + Nginx)

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 "app:create_app()"
```

Set `SECRET_KEY` to a strong random value in production and set `debug=False`.

---

## 📝 License
MIT License — free to use and modify.
