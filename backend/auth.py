from flask import request, jsonify
from flask_jwt_extended import jwt_required, create_access_token, get_jwt_identity
import datetime
from models import db, User, InvitationCode

def register_routes(app):
    @app.route('/api/register', methods=['POST'])
    def register():
        data = request.get_json()
        
        # Validate input
        if not data or not data.get('username') or not data.get('email') or not data.get('password') or not data.get('invitation_code'):
            return jsonify({'error': 'Missing required fields'}), 400
        
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        invitation_code_str = data.get('invitation_code')
        
        # Check if user already exists
        if User.query.filter_by(username=username).first():
            return jsonify({'error': 'Username already exists'}), 400
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email already exists'}), 400
        
        # Verify invitation code
        invitation_code = InvitationCode.query.filter_by(code=invitation_code_str).first()
        if not invitation_code:
            return jsonify({'error': 'Invalid invitation code'}), 400
        
        if not invitation_code.is_valid():
            return jsonify({'error': 'Invitation code is no longer valid'}), 400
        
        # Create new user
        user = User(username=username, email=email, invitation_code=invitation_code)
        user.set_password(password)
        
        # Increment code usage
        invitation_code.increment_usage()
        
        # Save user to database
        db.session.add(user)
        db.session.commit()
        
        # Generate access token
        access_token = create_access_token(identity=username)
        
        return jsonify({
            'message': 'User registered successfully',
            'access_token': access_token
        }), 201

    @app.route('/api/login', methods=['POST'])
    def login():
        data = request.get_json()
        
        if not data or not data.get('username') or not data.get('password'):
            return jsonify({'error': 'Missing username or password'}), 400
        
        username = data.get('username')
        password = data.get('password')
        
        # Find user
        user = User.query.filter_by(username=username).first()
        if not user or not user.check_password(password):
            return jsonify({'error': 'Invalid username or password'}), 401
        
        # Update last login time
        user.last_login = datetime.datetime.utcnow()
        db.session.commit()
        
        # Generate access token
        access_token = create_access_token(identity=username)
        
        return jsonify({
            'message': 'Login successful',
            'access_token': access_token
        }), 200

    @app.route('/api/invitation-codes', methods=['POST'])
    @jwt_required()
    def generate_invitation_codes():
        # This endpoint should be admin-only, but for simplicity we're allowing any authenticated user
        username = get_jwt_identity()
        user = User.query.filter_by(username=username).first()
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Generate 50 invitation codes
        codes = InvitationCode.generate_batch(count=50, max_uses=10)
        
        return jsonify({
            'message': 'Invitation codes generated successfully',
            'codes': codes
        }), 201

    @app.route('/api/verify-invitation', methods=['POST'])
    def verify_invitation():
        data = request.get_json()
        
        if not data or not data.get('code'):
            return jsonify({'error': 'Invitation code is required'}), 400
        
        code = data.get('code')
        invitation = InvitationCode.query.filter_by(code=code).first()
        
        if not invitation:
            return jsonify({'valid': False, 'error': 'Invalid invitation code'}), 200
        
        if not invitation.is_valid():
            return jsonify({'valid': False, 'error': 'Invitation code has already been used'}), 200
        
        return jsonify({
            'valid': True,
            'uses': invitation.uses,
            'max_uses': invitation.max_uses,
            'remaining': invitation.max_uses - invitation.uses
        }), 200 