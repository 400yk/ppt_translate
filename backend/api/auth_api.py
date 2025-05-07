"""
API endpoints for handling user authentication and invitation codes.
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, create_access_token, get_jwt_identity
import datetime
from db.models import db, User, InvitationCode

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    
    # Validate input - invitation code is now optional
    if not data or not data.get('username') or not data.get('email') or not data.get('password'):
        return jsonify({
            'error': 'errors.missing_fields',
            'message': 'errors.fill_all_fields'
        }), 400
    
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    invitation_code_str = data.get('invitation_code')  # This can be None now
    
    # Check if user already exists
    if User.query.filter_by(username=username).first():
        return jsonify({
            'error': 'Username already exists',
            'errorKey': 'errors.username_exists'
        }), 400
    if User.query.filter_by(email=email).first():
        return jsonify({
            'error': 'Email already exists',
            'errorKey': 'errors.email_exists'
        }), 400
    
    # Variables to track invitation code status
    has_valid_invitation = False
    invitation_code = None
    
    # Verify invitation code if provided
    if invitation_code_str:
        invitation_code = InvitationCode.query.filter_by(code=invitation_code_str).first()
        if invitation_code and invitation_code.is_valid():
            has_valid_invitation = True
        elif invitation_code_str:  # Code was provided but is invalid
            if not invitation_code:
                return jsonify({
                    'error': 'Invalid invitation code',
                    'errorKey': 'errors.code_invalid'
                }), 400
            else:
                return jsonify({
                    'error': 'Invitation code has already been used',
                    'errorKey': 'errors.code_already_used'
                }), 400
    
    # Create new user
    user = User(username=username, email=email, invitation_code=invitation_code)
    user.set_password(password)
    
    # Mark code as used if a valid code was provided
    if has_valid_invitation and invitation_code:
        invitation_code.mark_as_used()
        # Activate membership for the new user with invitation code
        user.activate_paid_membership(is_invitation=True)
        print(f"Activated invitation-based membership for {user.username} until {user.membership_end}")
    
    # Save user to database
    db.session.add(user)
    db.session.commit()
    
    # Generate access token
    access_token = create_access_token(identity=username)
    
    return jsonify({
        'message': 'User registered successfully',
        'messageKey': 'auth.register_success',
        'has_invitation': has_valid_invitation,
        'access_token': access_token
    }), 201

@auth_bp.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({
            'error': 'Missing username or password',
            'errorKey': 'errors.missing_fields'
        }), 400
    
    username = data.get('username')
    password = data.get('password')
    
    # Find user
    user = User.query.filter_by(username=username).first()
    if not user or not user.check_password(password):
        return jsonify({
            'error': 'Invalid username or password',
            'errorKey': 'errors.login_failed'
        }), 401
    
    # Update last login time
    user.last_login = datetime.datetime.utcnow()
    db.session.commit()
    
    # Generate access token
    access_token = create_access_token(identity=username)
    
    # Check if the user has a valid invitation code
    has_invitation = user.invitation_code is not None and user.invitation_code.is_valid()
    
    return jsonify({
        'message': 'Login successful',
        'messageKey': 'auth.login_success',
        'has_invitation': has_invitation,
        'access_token': access_token
    }), 200

@auth_bp.route('/api/invitation-codes', methods=['POST'])
@jwt_required()
def generate_invitation_codes():
    # This endpoint should be admin-only, but for simplicity we're allowing any authenticated user
    username = get_jwt_identity()
    user = User.query.filter_by(username=username).first()
    
    if not user:
        return jsonify({
            'error': 'User not found',
            'errorKey': 'errors.authentication_error'
        }), 404
    
    # Generate 50 invitation codes
    codes = InvitationCode.generate_batch(count=50)
    
    return jsonify({
        'message': 'Invitation codes generated successfully',
        'codes': codes
    }), 201

@auth_bp.route('/api/verify-invitation', methods=['POST'])
def verify_invitation():
    data = request.get_json()
    
    if not data or not data.get('code'):
        return jsonify({
            'error': 'Invitation code is required',
            'errorKey': 'errors.missing_fields',
            'valid': False
        }), 400
    
    code = data.get('code')
    invitation = InvitationCode.query.filter_by(code=code).first()
    
    if not invitation:
        return jsonify({
            'valid': False,
            'error': 'Invalid invitation code',
            'errorKey': 'errors.code_invalid'
        }), 200
    
    if not invitation.is_valid():
        return jsonify({
            'valid': False,
            'error': 'Invitation code has already been used',
            'errorKey': 'errors.code_already_used'
        }), 200
    
    return jsonify({
        'valid': True,
        'message': 'Valid invitation code',
        'messageKey': 'auth.valid_code',
        'remaining': 1 if invitation.is_valid() else 0
    }), 200

@auth_bp.route('/api/user/usage', methods=['GET'])
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

@auth_bp.route('/api/admin/invitation-codes', methods=['GET'])
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
            'active': code.active,
            'last_used': code.last_used.isoformat() if code.last_used else None,
            'user_count': user_count,
            'is_used': user_count > 0
        })
        
    return jsonify({
        'total': len(result),
        'codes': result
    }), 200
    
@auth_bp.route('/api/admin/invitation-codes/<int:code_id>', methods=['PUT'])
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
        
    db.session.commit()
    
    return jsonify({
        'message': 'Invitation code updated successfully',
        'code': {
            'id': code.id,
            'code': code.code,
            'active': code.active,
            'is_used': code.users.count() > 0
        }
    }), 200 