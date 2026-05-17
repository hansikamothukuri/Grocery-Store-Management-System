"""
models/product.py - Product model
"""
from database.db import db
from datetime import datetime


class Product(db.Model):
    __tablename__ = 'products'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=True)
    price = db.Column(db.Numeric(10, 2), nullable=False)
    cost_price = db.Column(db.Numeric(10, 2), nullable=True)
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'), nullable=False)
    barcode = db.Column(db.String(50), unique=True, nullable=True)
    image_path = db.Column(db.String(255), nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship to inventory
    inventory = db.relationship('Inventory', backref='product', uselist=False, lazy=True)
    order_items = db.relationship('OrderItem', backref='product', lazy=True)

    def __repr__(self):
        return f'<Product {self.name}>'

    @property
    def stock_quantity(self):
        return self.inventory.quantity if self.inventory else 0

    @property
    def stock_status(self):
        qty = self.stock_quantity
        if qty == 0:
            return 'out_of_stock'
        elif qty <= (self.inventory.low_stock_threshold if self.inventory else 10):
            return 'low_stock'
        return 'in_stock'

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'price': float(self.price),
            'cost_price': float(self.cost_price) if self.cost_price else None,
            'category_id': self.category_id,
            'category_name': self.category.name if self.category else None,
            'barcode': self.barcode,
            'image_path': self.image_path,
            'is_active': self.is_active,
            'stock_quantity': self.stock_quantity,
            'stock_status': self.stock_status,
        }
