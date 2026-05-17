"""
routes/products.py - Product management routes
"""
from flask import Blueprint, render_template, request, jsonify, current_app
from flask_login import login_required
from models.product import Product
from models.inventory import Inventory
from models.category import Category
from database.db import db
from werkzeug.utils import secure_filename
import os

products_bp = Blueprint('products', __name__)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@products_bp.route('/products')
@login_required
def index():
    return render_template('products/index.html')


@products_bp.route('/api/products', methods=['GET'])
@login_required
def get_products():
    search = request.args.get('search', '')
    category_id = request.args.get('category_id', type=int)
    status = request.args.get('status', '')
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    query = Product.query
    if search:
        query = query.filter(Product.name.ilike(f'%{search}%'))
    if category_id:
        query = query.filter_by(category_id=category_id)
    if status == 'active':
        query = query.filter_by(is_active=True)
    elif status == 'inactive':
        query = query.filter_by(is_active=False)

    pagination = query.order_by(Product.name).paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        'products': [p.to_dict() for p in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page,
    })


@products_bp.route('/api/products/<int:product_id>', methods=['GET'])
@login_required
def get_product(product_id):
    product = Product.query.get_or_404(product_id)
    return jsonify(product.to_dict())


@products_bp.route('/api/products', methods=['POST'])
@login_required
def create_product():
    try:
        # Handle both JSON and form data
        if request.is_json:
            data = request.get_json()
            image_path = None
        else:
            data = request.form.to_dict()
            image_path = None
            if 'image' in request.files:
                file = request.files['image']
                if file and allowed_file(file.filename):
                    filename = secure_filename(file.filename)
                    upload_path = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
                    file.save(upload_path)
                    image_path = f'uploads/{filename}'

        # Validate required fields
        required = ['name', 'price', 'category_id']
        for field in required:
            if not data.get(field):
                return jsonify({'success': False, 'message': f'{field} is required'}), 400

        product = Product(
            name=data['name'].strip(),
            description=data.get('description', ''),
            price=float(data['price']),
            cost_price=float(data['cost_price']) if data.get('cost_price') else None,
            category_id=int(data['category_id']),
            barcode=data.get('barcode', '').strip() or None,
            image_path=image_path,
            is_active=data.get('is_active', True) in [True, 'true', '1', 'on'],
        )
        db.session.add(product)
        db.session.flush()  # Get product ID

        # Create inventory record
        inventory = Inventory(
            product_id=product.id,
            quantity=int(data.get('quantity', 0)),
            low_stock_threshold=int(data.get('low_stock_threshold', 10)),
            unit=data.get('unit', 'pcs'),
        )
        db.session.add(inventory)
        db.session.commit()

        return jsonify({'success': True, 'message': 'Product created successfully', 'product': product.to_dict()}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@products_bp.route('/api/products/<int:product_id>', methods=['PUT'])
@login_required
def update_product(product_id):
    product = Product.query.get_or_404(product_id)
    try:
        if request.is_json:
            data = request.get_json()
        else:
            data = request.form.to_dict()
            if 'image' in request.files:
                file = request.files['image']
                if file and allowed_file(file.filename):
                    filename = secure_filename(file.filename)
                    upload_path = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
                    file.save(upload_path)
                    product.image_path = f'uploads/{filename}'

        if 'name' in data:
            product.name = data['name'].strip()
        if 'description' in data:
            product.description = data['description']
        if 'price' in data:
            product.price = float(data['price'])
        if 'cost_price' in data:
            product.cost_price = float(data['cost_price']) if data['cost_price'] else None
        if 'category_id' in data:
            product.category_id = int(data['category_id'])
        if 'barcode' in data:
            product.barcode = data['barcode'].strip() or None
        if 'is_active' in data:
            product.is_active = data['is_active'] in [True, 'true', '1', 'on']

        # Update inventory
        if product.inventory:
            if 'quantity' in data:
                product.inventory.quantity = int(data['quantity'])
            if 'low_stock_threshold' in data:
                product.inventory.low_stock_threshold = int(data['low_stock_threshold'])
            if 'unit' in data:
                product.inventory.unit = data['unit']

        db.session.commit()
        return jsonify({'success': True, 'message': 'Product updated successfully', 'product': product.to_dict()})

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@products_bp.route('/api/products/<int:product_id>', methods=['DELETE'])
@login_required
def delete_product(product_id):
    product = Product.query.get_or_404(product_id)
    try:
        # Soft delete
        product.is_active = False
        db.session.commit()
        return jsonify({'success': True, 'message': 'Product deactivated successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@products_bp.route('/api/categories', methods=['GET'])
@login_required
def get_categories():
    categories = Category.query.order_by(Category.name).all()
    return jsonify([c.to_dict() for c in categories])


@products_bp.route('/api/categories', methods=['POST'])
@login_required
def create_category():
    data = request.get_json()
    if not data.get('name'):
        return jsonify({'success': False, 'message': 'Category name required'}), 400
    if Category.query.filter_by(name=data['name'].strip()).first():
        return jsonify({'success': False, 'message': 'Category already exists'}), 400
    cat = Category(name=data['name'].strip(), description=data.get('description', ''))
    db.session.add(cat)
    db.session.commit()
    return jsonify({'success': True, 'category': cat.to_dict()}), 201


@products_bp.route('/api/inventory/restock', methods=['POST'])
@login_required
def restock():
    data = request.get_json()
    product_id = data.get('product_id')
    quantity = data.get('quantity', 0)
    if not product_id or quantity <= 0:
        return jsonify({'success': False, 'message': 'Invalid data'}), 400
    inventory = Inventory.query.filter_by(product_id=product_id).first()
    if not inventory:
        return jsonify({'success': False, 'message': 'Inventory record not found'}), 404
    inventory.add_stock(int(quantity))
    return jsonify({'success': True, 'message': f'Added {quantity} units', 'new_quantity': inventory.quantity})
