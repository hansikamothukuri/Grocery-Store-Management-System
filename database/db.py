"""
database/db.py - Database initialization and configuration
"""
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import create_engine, text
from sqlalchemy.engine.url import make_url


db = SQLAlchemy()


def create_database_if_missing(app):
    """Create the MySQL database if it does not exist yet."""
    database_uri = app.config.get('SQLALCHEMY_DATABASE_URI')
    if not database_uri:
        return

    url = make_url(database_uri)
    if not url.drivername.startswith('mysql'):
        return

    database_name = url.database
    if not database_name:
        return

    # Connect to the MySQL server without selecting a database first.
    server_url = url.set(database='')
    engine = create_engine(server_url, pool_pre_ping=True)
    with engine.connect() as conn:
        conn.execution_options(isolation_level='AUTOCOMMIT').execute(
            text(
                f"CREATE DATABASE IF NOT EXISTS `{database_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            )
        )


def init_db(app):
    """Initialize database with Flask app."""
    create_database_if_missing(app)
    db.init_app(app)
    with app.app_context():
        # Ensure all models are imported so SQLAlchemy can create their tables.
        import models  # noqa: F401

        db.create_all()
        _seed_default_data()


def _seed_default_data():
    """Seed default admin user and categories if not present."""
    from models.user import User
    from models.category import Category
    from werkzeug.security import generate_password_hash

    # Create default admin
    if not User.query.filter_by(username='admin').first():
        admin = User(
            username='admin',
            email='admin@grocerystore.com',
            password_hash=generate_password_hash('admin123'),
            role='admin',
            full_name='Store Administrator'
        )
        db.session.add(admin)

    # Create default categories
    default_categories = [
        ('Fruits & Vegetables', 'Fresh produce'),
        ('Dairy & Eggs', 'Milk, cheese, butter, eggs'),
        ('Bakery', 'Breads, pastries, cakes'),
        ('Meat & Seafood', 'Fresh meat and fish'),
        ('Beverages', 'Juices, sodas, water'),
        ('Snacks', 'Chips, biscuits, candy'),
        ('Grains & Pulses', 'Rice, dal, flour'),
        ('Personal Care', 'Soap, shampoo, toothpaste'),
        ('Household', 'Cleaning supplies'),
        ('Frozen Foods', 'Ice cream, frozen meals'),
    ]
    for name, desc in default_categories:
        if not Category.query.filter_by(name=name).first():
            cat = Category(name=name, description=desc)
            db.session.add(cat)

    db.session.commit()
