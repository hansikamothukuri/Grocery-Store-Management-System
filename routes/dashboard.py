"""
routes/dashboard.py - Dashboard routes and analytics
"""
from flask import Blueprint, render_template, jsonify
from flask_login import login_required, current_user
from models.product import Product
from models.order import Order, OrderItem
from models.inventory import Inventory
from models.category import Category
from database.db import db
from datetime import datetime, timedelta
from sqlalchemy import func

dashboard_bp = Blueprint('dashboard', __name__)


@dashboard_bp.route('/')
@dashboard_bp.route('/dashboard')
@login_required
def index():
    return render_template('dashboard/index.html')


@dashboard_bp.route('/api/dashboard/stats')
@login_required
def get_stats():
    today = datetime.utcnow().date()
    month_start = today.replace(day=1)

    # Total products
    total_products = Product.query.filter_by(is_active=True).count()

    # Total sales today
    today_sales = db.session.query(func.sum(Order.total_amount)).filter(
        func.date(Order.created_at) == today,
        Order.payment_status == 'paid'
    ).scalar() or 0

    # Total sales this month
    month_sales = db.session.query(func.sum(Order.total_amount)).filter(
        func.date(Order.created_at) >= month_start,
        Order.payment_status == 'paid'
    ).scalar() or 0

    # Total orders today
    today_orders = Order.query.filter(
        func.date(Order.created_at) == today
    ).count()

    # Low stock count
    low_stock_count = Inventory.query.filter(
        Inventory.quantity > 0,
        Inventory.quantity <= Inventory.low_stock_threshold
    ).count()

    # Out of stock count
    out_of_stock_count = Inventory.query.filter(
        Inventory.quantity <= 0
    ).count()

    # Total categories
    total_categories = Category.query.count()

    # Total orders overall
    total_orders = Order.query.count()

    return jsonify({
        'total_products': total_products,
        'today_sales': float(today_sales),
        'month_sales': float(month_sales),
        'today_orders': today_orders,
        'low_stock_count': low_stock_count,
        'out_of_stock_count': out_of_stock_count,
        'total_categories': total_categories,
        'total_orders': total_orders,
    })


@dashboard_bp.route('/api/dashboard/recent-orders')
@login_required
def recent_orders():
    orders = Order.query.order_by(Order.created_at.desc()).limit(10).all()
    return jsonify([o.to_dict() for o in orders])


@dashboard_bp.route('/api/dashboard/low-stock')
@login_required
def low_stock():
    low_stock_items = Inventory.query.filter(
        Inventory.quantity <= Inventory.low_stock_threshold
    ).order_by(Inventory.quantity.asc()).limit(10).all()
    result = []
    for item in low_stock_items:
        result.append({
            'product_id': item.product_id,
            'product_name': item.product.name,
            'quantity': item.quantity,
            'threshold': item.low_stock_threshold,
            'status': 'out_of_stock' if item.quantity == 0 else 'low_stock',
            'category': item.product.category.name if item.product.category else 'N/A',
        })
    return jsonify(result)


@dashboard_bp.route('/api/dashboard/sales-chart')
@login_required
def sales_chart():
    """Last 7 days sales data."""
    today = datetime.utcnow().date()
    labels = []
    values = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        sales = db.session.query(func.sum(Order.total_amount)).filter(
            func.date(Order.created_at) == day,
            Order.payment_status == 'paid'
        ).scalar() or 0
        labels.append(day.strftime('%a, %d %b'))
        values.append(float(sales))
    return jsonify({'labels': labels, 'values': values})


@dashboard_bp.route('/api/dashboard/top-products')
@login_required
def top_products():
    """Top 5 most sold products."""
    results = db.session.query(
        Product.name,
        func.sum(OrderItem.quantity).label('total_sold'),
        func.sum(OrderItem.total_price).label('revenue')
    ).join(OrderItem, Product.id == OrderItem.product_id)\
     .join(Order, OrderItem.order_id == Order.id)\
     .filter(Order.payment_status == 'paid')\
     .group_by(Product.id, Product.name)\
     .order_by(func.sum(OrderItem.quantity).desc())\
     .limit(5).all()

    return jsonify([{
        'name': r.name,
        'total_sold': int(r.total_sold),
        'revenue': float(r.revenue)
    } for r in results])


@dashboard_bp.route('/api/dashboard/category-distribution')
@login_required
def category_distribution():
    results = db.session.query(
        Category.name,
        func.count(Product.id).label('count')
    ).join(Product, Category.id == Product.category_id)\
     .filter(Product.is_active == True)\
     .group_by(Category.id, Category.name).all()
    return jsonify([{'name': r.name, 'count': r.count} for r in results])
