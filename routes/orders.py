"""
routes/orders.py - Order/billing management routes
"""
from flask import Blueprint, render_template, request, jsonify, make_response
from flask_login import login_required, current_user
from models.order import Order, OrderItem
from models.product import Product
from models.inventory import Inventory
from database.db import db
from datetime import datetime, timedelta
from sqlalchemy import func
import csv
from io import StringIO

orders_bp = Blueprint('orders', __name__)


@orders_bp.route('/billing')
@login_required
def billing():
    return render_template('orders/billing.html')


@orders_bp.route('/orders')
@login_required
def orders():
    return render_template('orders/history.html')


@orders_bp.route('/api/orders', methods=['GET'])
@login_required
def get_orders():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')
    search = request.args.get('search', '')
    status = request.args.get('status', '')

    query = Order.query
    if search:
        query = query.filter(
            db.or_(
                Order.order_number.ilike(f'%{search}%'),
                Order.customer_name.ilike(f'%{search}%')
            )
        )
    if status:
        query = query.filter_by(payment_status=status)
    if date_from:
        query = query.filter(func.date(Order.created_at) >= date_from)
    if date_to:
        query = query.filter(func.date(Order.created_at) <= date_to)

    pagination = query.order_by(Order.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        'orders': [o.to_dict() for o in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page,
    })


@orders_bp.route('/api/orders/export', methods=['GET'])
@login_required
def export_orders():
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')
    search = request.args.get('search', '')
    status = request.args.get('status', '')

    query = Order.query
    if search:
        query = query.filter(
            db.or_(
                Order.order_number.ilike(f'%{search}%'),
                Order.customer_name.ilike(f'%{search}%')
            )
        )
    if status:
        query = query.filter_by(payment_status=status)
    if date_from:
        query = query.filter(func.date(Order.created_at) >= date_from)
    if date_to:
        query = query.filter(func.date(Order.created_at) <= date_to)

    orders = query.order_by(Order.created_at.desc()).all()

    csv_buffer = StringIO()
    writer = csv.writer(csv_buffer)
    writer.writerow([
        'Order Number', 'Customer', 'Phone', 'Payment Status', 'Payment Method',
        'Date', 'Subtotal', 'Discount', 'Tax', 'Total', 'Items', 'Cashier'
    ])

    for order in orders:
        items_text = '; '.join(
            f"{item.quantity} x {item.product.name if item.product else 'Unknown'}"
            for item in order.items
        )
        writer.writerow([
            order.order_number,
            order.customer_name or 'Walk-in',
            order.customer_phone or '',
            order.payment_status,
            order.payment_method,
            order.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            f"{float(order.subtotal):.2f}",
            f"{float(order.discount):.2f}",
            f"{float(order.tax):.2f}",
            f"{float(order.total_amount):.2f}",
            items_text,
            order.cashier.full_name if order.cashier else 'System',
        ])

    response = make_response(csv_buffer.getvalue())
    response.headers['Content-Type'] = 'text/csv; charset=utf-8'
    response.headers['Content-Disposition'] = 'attachment; filename=orders_report.csv'
    return response


@orders_bp.route('/api/orders/<int:order_id>', methods=['GET'])
@login_required
def get_order(order_id):
    order = Order.query.get_or_404(order_id)
    return jsonify(order.to_dict())


@orders_bp.route('/api/orders', methods=['POST'])
@login_required
def create_order():
    data = request.get_json()
    items = data.get('items', [])

    if not items:
        return jsonify({'success': False, 'message': 'No items in order'}), 400

    try:
        # Validate stock for all items first
        for item in items:
            product = Product.query.get(item['product_id'])
            if not product:
                return jsonify({'success': False, 'message': f'Product ID {item["product_id"]} not found'}), 404
            if not product.inventory or product.inventory.quantity < item['quantity']:
                return jsonify({
                    'success': False,
                    'message': f'Insufficient stock for {product.name}. Available: {product.stock_quantity}'
                }), 400

        # Calculate totals
        subtotal = sum(
            Product.query.get(item['product_id']).price * item['quantity']
            for item in items
        )
        discount = float(data.get('discount', 0))
        tax_rate = float(data.get('tax_rate', 0))
        tax = round((float(subtotal) - discount) * tax_rate / 100, 2)
        total = round(float(subtotal) - discount + tax, 2)

        # Create order
        order = Order(
            order_number=Order.generate_order_number(),
            customer_name=data.get('customer_name', 'Walk-in Customer'),
            customer_phone=data.get('customer_phone', ''),
            subtotal=subtotal,
            discount=discount,
            tax=tax,
            total_amount=total,
            payment_method=data.get('payment_method', 'cash'),
            payment_status='paid',
            notes=data.get('notes', ''),
            created_by=current_user.id,
        )
        db.session.add(order)
        db.session.flush()

        # Add order items and deduct stock
        for item in items:
            product = Product.query.get(item['product_id'])
            qty = int(item['quantity'])
            order_item = OrderItem(
                order_id=order.id,
                product_id=product.id,
                quantity=qty,
                unit_price=product.price,
                total_price=product.price * qty,
            )
            db.session.add(order_item)
            product.inventory.quantity -= qty

        db.session.commit()
        return jsonify({
            'success': True,
            'message': 'Order created successfully',
            'order': order.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@orders_bp.route('/api/orders/<int:order_id>/cancel', methods=['POST'])
@login_required
def cancel_order(order_id):
    order = Order.query.get_or_404(order_id)
    if order.payment_status == 'cancelled':
        return jsonify({'success': False, 'message': 'Order already cancelled'}), 400
    try:
        # Restore stock
        for item in order.items:
            if item.product and item.product.inventory:
                item.product.inventory.quantity += item.quantity
        order.payment_status = 'cancelled'
        db.session.commit()
        return jsonify({'success': True, 'message': 'Order cancelled and stock restored'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@orders_bp.route('/api/orders/<int:order_id>/invoice')
@login_required
def get_invoice(order_id):
    """Return invoice data as JSON (PDF generation is handled in frontend)."""
    order = Order.query.get_or_404(order_id)
    return jsonify({'success': True, 'invoice': order.to_dict()})


@orders_bp.route('/api/analytics/sales-report')
@login_required
def sales_report():
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')

    query = Order.query.filter_by(payment_status='paid')
    if date_from:
        query = query.filter(func.date(Order.created_at) >= date_from)
    if date_to:
        query = query.filter(func.date(Order.created_at) <= date_to)

    orders = query.all()
    total_revenue = sum(float(o.total_amount) for o in orders)
    total_orders = len(orders)
    avg_order_value = total_revenue / total_orders if total_orders > 0 else 0

    # Daily breakdown
    daily = {}
    for o in orders:
        day = o.created_at.date().isoformat()
        daily[day] = daily.get(day, {'revenue': 0, 'orders': 0})
        daily[day]['revenue'] += float(o.total_amount)
        daily[day]['orders'] += 1

    return jsonify({
        'total_revenue': total_revenue,
        'total_orders': total_orders,
        'avg_order_value': avg_order_value,
        'daily_breakdown': [{'date': k, **v} for k, v in sorted(daily.items())],
    })
