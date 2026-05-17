"""
models/order.py - Order and OrderItem models
"""
from database.db import db
from datetime import datetime


class Order(db.Model):
    __tablename__ = 'orders'

    id = db.Column(db.Integer, primary_key=True)
    order_number = db.Column(db.String(20), unique=True, nullable=False)
    customer_name = db.Column(db.String(150), nullable=True, default='Walk-in Customer')
    customer_phone = db.Column(db.String(20), nullable=True)
    subtotal = db.Column(db.Numeric(10, 2), default=0)
    discount = db.Column(db.Numeric(10, 2), default=0)
    tax = db.Column(db.Numeric(10, 2), default=0)
    total_amount = db.Column(db.Numeric(10, 2), nullable=False)
    payment_method = db.Column(db.String(30), default='cash')  # cash, card, upi
    payment_status = db.Column(db.String(20), default='paid')  # paid, pending, cancelled
    notes = db.Column(db.Text, nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    items = db.relationship('OrderItem', backref='order', lazy=True, cascade='all, delete-orphan')
    cashier = db.relationship('User', foreign_keys=[created_by])

    def __repr__(self):
        return f'<Order {self.order_number}>'

    @staticmethod
    def generate_order_number():
        """Generate unique order number."""
        from datetime import date
        today = date.today().strftime('%Y%m%d')
        last_order = Order.query.filter(
            Order.order_number.like(f'ORD-{today}-%')
        ).order_by(Order.id.desc()).first()
        if last_order:
            seq = int(last_order.order_number.split('-')[-1]) + 1
        else:
            seq = 1
        return f'ORD-{today}-{seq:04d}'

    def to_dict(self):
        return {
            'id': self.id,
            'order_number': self.order_number,
            'customer_name': self.customer_name,
            'customer_phone': self.customer_phone,
            'subtotal': float(self.subtotal),
            'discount': float(self.discount),
            'tax': float(self.tax),
            'total_amount': float(self.total_amount),
            'payment_method': self.payment_method,
            'payment_status': self.payment_status,
            'notes': self.notes,
            'created_at': self.created_at.isoformat(),
            'items': [item.to_dict() for item in self.items],
            'cashier': self.cashier.full_name if self.cashier else 'System',
        }


class OrderItem(db.Model):
    __tablename__ = 'order_items'

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    unit_price = db.Column(db.Numeric(10, 2), nullable=False)
    total_price = db.Column(db.Numeric(10, 2), nullable=False)

    def __repr__(self):
        return f'<OrderItem Order:{self.order_id} Product:{self.product_id}>'

    def to_dict(self):
        return {
            'id': self.id,
            'product_id': self.product_id,
            'product_name': self.product.name if self.product else 'Unknown',
            'quantity': self.quantity,
            'unit_price': float(self.unit_price),
            'total_price': float(self.total_price),
        }
