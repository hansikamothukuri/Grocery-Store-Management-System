"""
models/inventory.py - Inventory model for stock management
"""
from database.db import db
from datetime import datetime


class Inventory(db.Model):
    __tablename__ = 'inventory'

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), unique=True, nullable=False)
    quantity = db.Column(db.Integer, default=0, nullable=False)
    low_stock_threshold = db.Column(db.Integer, default=10)
    unit = db.Column(db.String(20), default='pcs')  # pcs, kg, litre, etc.
    last_restocked = db.Column(db.DateTime, nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f'<Inventory Product:{self.product_id} Qty:{self.quantity}>'

    @property
    def is_low_stock(self):
        return 0 < self.quantity <= self.low_stock_threshold

    @property
    def is_out_of_stock(self):
        return self.quantity <= 0

    def deduct_stock(self, qty):
        """Deduct stock after sale."""
        if self.quantity < qty:
            raise ValueError(f"Insufficient stock. Available: {self.quantity}, Requested: {qty}")
        self.quantity -= qty
        db.session.commit()

    def add_stock(self, qty):
        """Add stock during restock."""
        self.quantity += qty
        self.last_restocked = datetime.utcnow()
        db.session.commit()

    def to_dict(self):
        return {
            'id': self.id,
            'product_id': self.product_id,
            'quantity': self.quantity,
            'low_stock_threshold': self.low_stock_threshold,
            'unit': self.unit,
            'is_low_stock': self.is_low_stock,
            'is_out_of_stock': self.is_out_of_stock,
            'last_restocked': self.last_restocked.isoformat() if self.last_restocked else None,
        }
