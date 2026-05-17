"""
routes/auth.py - Authentication routes
"""
from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import check_password_hash, generate_password_hash
from models.user import User
from database.db import db
from datetime import datetime

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard.index'))

    if request.method == 'POST':
        data = request.get_json() if request.is_json else request.form
        username = data.get('username', '').strip()
        password = data.get('password', '')
        remember = data.get('remember', False)

        if not username or not password:
            if request.is_json:
                return jsonify({'success': False, 'message': 'Username and password required'}), 400
            flash('Please fill in all fields.', 'danger')
            return render_template('auth/login.html')

        user = User.query.filter_by(username=username).first()
        if not user or not check_password_hash(user.password_hash, password):
            if request.is_json:
                return jsonify({'success': False, 'message': 'Invalid credentials'}), 401
            flash('Invalid username or password.', 'danger')
            return render_template('auth/login.html')

        if not user.is_active:
            if request.is_json:
                return jsonify({'success': False, 'message': 'Account disabled'}), 403
            flash('Your account has been disabled.', 'danger')
            return render_template('auth/login.html')

        login_user(user, remember=remember)
        user.last_login = datetime.utcnow()
        db.session.commit()

        if request.is_json:
            return jsonify({'success': True, 'redirect': url_for('dashboard.index')})
        return redirect(url_for('dashboard.index'))

    return render_template('auth/login.html')


@auth_bp.route('/logout')
@login_required
def logout():
    logout_user()
    flash('You have been logged out.', 'info')
    return redirect(url_for('auth.login'))


@auth_bp.route('/profile', methods=['GET', 'POST'])
@login_required
def profile():
    if request.method == 'POST':
        data = request.get_json() if request.is_json else request.form
        full_name = data.get('full_name', '').strip()
        email = data.get('email', '').strip()
        current_password = data.get('current_password', '')
        new_password = data.get('new_password', '')

        if full_name:
            current_user.full_name = full_name
        if email:
            existing = User.query.filter_by(email=email).first()
            if existing and existing.id != current_user.id:
                return jsonify({'success': False, 'message': 'Email already in use'}), 400
            current_user.email = email

        if current_password and new_password:
            if not check_password_hash(current_user.password_hash, current_password):
                return jsonify({'success': False, 'message': 'Current password incorrect'}), 400
            current_user.password_hash = generate_password_hash(new_password)

        db.session.commit()
        return jsonify({'success': True, 'message': 'Profile updated successfully'})

    return render_template('auth/profile.html')
