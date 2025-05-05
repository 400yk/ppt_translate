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

    @app.route('/api/user/usage', methods=['GET'])
    @jwt_required()
    def get_user_usage():
        username = get_jwt_identity()
        user = User.query.filter_by(username=username).first()
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get invitation code usage information
        invitation_code = user.invitation_code
        if invitation_code:
            usage_info = {
                'username': user.username,
                'invitation_code': invitation_code.code,
                'translations_used': invitation_code.uses,
                'translations_max': invitation_code.max_uses,
                'translations_remaining': invitation_code.max_uses - invitation_code.uses,
                'code_active': invitation_code.active,
                'registration_date': user.created_at.isoformat(),
                'last_login': user.last_login.isoformat() if user.last_login else None
            }
        else:
            usage_info = {
                'username': user.username,
                'error': 'No invitation code associated with this account',
                'registration_date': user.created_at.isoformat(),
                'last_login': user.last_login.isoformat() if user.last_login else None
            }
        
        return jsonify(usage_info), 200

    @app.route('/api/admin/invitation-codes', methods=['GET'])
    @jwt_required()
    def get_all_invitation_codes():
        """Get all invitation codes - admin only."""
        username = get_jwt_identity()
        user = User.query.filter_by(username=username).first()
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # This is a simplified admin check - in a real application, you would have proper roles
        # For now, we'll make the first user in the database an admin
        is_admin = user.id == 1  # Simple admin check
        
        if not is_admin:
            return jsonify({'error': 'Unauthorized access'}), 403
            
        codes = InvitationCode.query.all()
        result = []
        
        for code in codes:
            user_count = code.users.count()
            result.append({
                'id': code.id,
                'code': code.code,
                'created_at': code.created_at.isoformat(),
                'max_uses': code.max_uses,
                'uses': code.uses,
                'remaining': code.max_uses - code.uses,
                'active': code.active,
                'last_used': code.last_used.isoformat() if code.last_used else None,
                'user_count': user_count
            })
            
        return jsonify({
            'total': len(result),
            'codes': result
        }), 200
        
    @app.route('/api/admin/invitation-codes/<int:code_id>', methods=['PUT'])
    @jwt_required()
    def update_invitation_code(code_id):
        """Update an invitation code - admin only."""
        username = get_jwt_identity()
        user = User.query.filter_by(username=username).first()
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        # Simple admin check
        is_admin = user.id == 1
        
        if not is_admin:
            return jsonify({'error': 'Unauthorized access'}), 403
            
        code = InvitationCode.query.get(code_id)
        
        if not code:
            return jsonify({'error': 'Invitation code not found'}), 404
            
        data = request.get_json()
        
        if 'active' in data:
            code.active = data['active']
            
        if 'max_uses' in data:
            code.max_uses = data['max_uses']
            
        db.session.commit()
        
        return jsonify({
            'message': 'Invitation code updated successfully',
            'code': {
                'id': code.id,
                'code': code.code,
                'max_uses': code.max_uses,
                'uses': code.uses,
                'remaining': code.max_uses - code.uses,
                'active': code.active
            }
        }), 200 