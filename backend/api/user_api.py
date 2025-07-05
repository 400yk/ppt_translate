"""
API endpoints for handling user-related operations.
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from db.models import User, db
from services.user_service import UserService

user_bp = Blueprint('user', __name__)

@user_bp.route('/api/user/profile', methods=['GET'])
@jwt_required()
def get_user_profile():
    """
    Get the current user's profile information.
    """
    try:
        username = get_jwt_identity()
        print(f"Fetching profile for user: {username}")
        
        # Find user by username
        user = User.query.filter_by(username=username).first()
        
        if not user:
            print(f"User not found: {username}")
            return jsonify({'error': 'User not found'}), 404
            
        # Return user profile information
        return jsonify({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'created_at': user.created_at.isoformat(),
            'last_login': user.last_login.isoformat() if user.last_login else None,
            'is_email_verified': user.is_email_verified
        })
        
    except Exception as e:
        print(f"Error getting user profile: {str(e)}")
        return jsonify({
            'error': 'Failed to get user profile',
            'message': str(e)
        }), 500

@user_bp.route('/api/user/profile', methods=['PUT'])
@jwt_required()
def update_user_profile():
    """
    Update the current user's profile information.
    
    Request body:
    {
        "email": "new.email@example.com" (optional),
        "password": "new_password" (optional)
    }
    """
    try:
        username = get_jwt_identity()
        print(f"Updating profile for user: {username}")
        
        # Find user by username
        user = User.query.filter_by(username=username).first()
        
        if not user:
            print(f"User not found: {username}")
            return jsonify({'error': 'User not found'}), 404
            
        # Get request data
        if not request.is_json:
            print("Error: Request data is not JSON")
            return jsonify({
                'error': 'Invalid request format', 
                'message': 'Request must be in JSON format'
            }), 400
            
        data = request.get_json()
        print(f"Request data: {data}")
        
        if not data:
            print("Error: Empty request data")
            return jsonify({
                'error': 'Empty request data', 
                'message': 'No data provided in request'
            }), 400
            
        # Update email if provided
        if 'email' in data and data['email']:
            # Check if email is already in use by another user
            existing_user = User.query.filter(User.email == data['email'], User.username != username).first()
            if existing_user:
                return jsonify({
                    'error': 'Email already in use',
                    'message': 'This email address is already registered to another account'
                }), 400
                
            user.email = data['email']
            
        # Update password if provided
        if 'password' in data and data['password']:
            user.set_password(data['password'])
            
        # Save changes
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Profile updated successfully'
        })
        
    except Exception as e:
        print(f"Error updating user profile: {str(e)}")
        return jsonify({
            'error': 'Failed to update profile',
            'message': str(e)
        }), 500

@user_bp.route('/api/user/dashboard', methods=['GET'])
@jwt_required()
def get_user_dashboard():
    """
    Get comprehensive dashboard data for the authenticated user.
    Includes membership status, referral stats, and permissions.
    """
    try:
        username = get_jwt_identity()
        user = User.query.filter_by(username=username).first()
        
        if not user:
            return jsonify({
                'error': 'User not found',
                'errorKey': 'errors.user_not_found'
            }), 404
        
        # Get comprehensive dashboard data using UserService
        dashboard_data = UserService.get_user_dashboard_data(user)
        
        return jsonify({
            'success': True,
            'data': dashboard_data
        })
        
    except Exception as e:
        print(f"Error getting user dashboard: {str(e)}")
        return jsonify({
            'error': 'Failed to get dashboard data',
            'errorKey': 'errors.dashboard_fetch_failed',
            'message': str(e)
        }), 500

@user_bp.route('/api/user/membership-status', methods=['GET'])
@jwt_required()
def get_membership_status():
    """
    Get detailed membership status for the authenticated user.
    Useful for frontend components to check eligibility for features.
    """
    try:
        username = get_jwt_identity()
        user = User.query.filter_by(username=username).first()
        
        if not user:
            return jsonify({
                'error': 'User not found',
                'errorKey': 'errors.user_not_found'
            }), 404
        
        membership_status = UserService.get_membership_status(user)
        referral_stats = UserService.get_referral_stats(user)
        permissions = UserService.get_user_permissions(user)
        can_show_popup = UserService.can_show_referral_popup(user)
        
        return jsonify({
            'success': True,
            'membership': membership_status,
            'referrals': referral_stats,
            'permissions': permissions,
            'can_show_referral_popup': can_show_popup
        })
        
    except Exception as e:
        print(f"Error getting membership status: {str(e)}")
        return jsonify({
            'error': 'Failed to get membership status',
            'errorKey': 'errors.membership_status_failed',
            'message': str(e)
        }), 500 