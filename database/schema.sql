-- ============================================================
-- FreshMart Grocery Store Management System
-- Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS grocery_store_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE grocery_store_db;

-- ─── Users ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    username        VARCHAR(80)  NOT NULL UNIQUE,
    email           VARCHAR(120) NOT NULL UNIQUE,
    password_hash   VARCHAR(256) NOT NULL,
    full_name       VARCHAR(150) NOT NULL,
    role            VARCHAR(20)  DEFAULT 'staff',
    is_active       BOOLEAN      DEFAULT TRUE,
    created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP,
    last_login      DATETIME     NULL
) ENGINE=InnoDB;

-- ─── Categories ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255) NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ─── Products ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(150)   NOT NULL,
    description TEXT           NULL,
    price       DECIMAL(10,2)  NOT NULL,
    cost_price  DECIMAL(10,2)  NULL,
    category_id INT            NOT NULL,
    barcode     VARCHAR(50)    UNIQUE NULL,
    image_path  VARCHAR(255)   NULL,
    is_active   BOOLEAN        DEFAULT TRUE,
    created_at  DATETIME       DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
) ENGINE=InnoDB;

-- ─── Inventory ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    product_id          INT         NOT NULL UNIQUE,
    quantity            INT         DEFAULT 0,
    low_stock_threshold INT         DEFAULT 10,
    unit                VARCHAR(20) DEFAULT 'pcs',
    last_restocked      DATETIME    NULL,
    updated_at          DATETIME    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

-- ─── Orders ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    order_number    VARCHAR(20)   NOT NULL UNIQUE,
    customer_name   VARCHAR(150)  DEFAULT 'Walk-in Customer',
    customer_phone  VARCHAR(20)   NULL,
    subtotal        DECIMAL(10,2) DEFAULT 0,
    discount        DECIMAL(10,2) DEFAULT 0,
    tax             DECIMAL(10,2) DEFAULT 0,
    total_amount    DECIMAL(10,2) NOT NULL,
    payment_method  VARCHAR(30)   DEFAULT 'cash',
    payment_status  VARCHAR(20)   DEFAULT 'paid',
    notes           TEXT          NULL,
    created_by      INT           NULL,
    created_at      DATETIME      DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

-- ─── Order Items ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    order_id    INT           NOT NULL,
    product_id  INT           NOT NULL,
    quantity    INT           NOT NULL,
    unit_price  DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id)   REFERENCES orders(id)  ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

-- ─── Indexes ─────────────────────────────────────────────────
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_active   ON products(is_active);
CREATE INDEX idx_orders_date       ON orders(created_at);
CREATE INDEX idx_orders_status     ON orders(payment_status);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_inventory_qty     ON inventory(quantity);

-- ─── Sample Data ─────────────────────────────────────────────
-- Admin user (password: admin123)
INSERT INTO users (username, email, password_hash, full_name, role)
VALUES ('admin', 'admin@grocerystore.com',
        'scrypt:32768:8:1$salt$hash_here',  -- use Flask's generate_password_hash
        'Store Administrator', 'admin');

-- Note: Run the Flask app first to auto-seed via database/db.py
-- The app creates the admin user and default categories automatically.
