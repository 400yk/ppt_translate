"""
API endpoints for handling user membership actions.
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import User, db
from services.user_service import process_membership_purchase, get_membership_status
import config

membership_bp = Blueprint('membership', __name__)

@membership_bp.route('/api/membership/status', methods=['GET'])
@jwt_required()
def get_user_membership_status():
    """
    Get the current user's membership status.
    """
    try:
        username = get_jwt_identity()
        print(f"Fetching membership status for user: {username}")
        
        # Find user by username
        user = User.query.filter_by(username=username).first()
        
        if not user:
            print(f"User not found: {username}")
            return jsonify({'error': 'User not found'}), 404
            
        # Get membership status
        status = get_membership_status(user)
        print(f"Membership status: {status}")
        
        return jsonify(status)
        
    except Exception as e:
        print(f"Error getting membership status: {str(e)}")
        return jsonify({
            'error': 'Failed to get membership status',
            'message': str(e)
        }), 500

@membership_bp.route('/api/membership/purchase', methods=['POST'])
@jwt_required()
def purchase_membership():
    """
    Process a membership purchase for the authenticated user.
    
    Request body:
    {
        "plan_type": "monthly" or "yearly"
    }
    """
    try:
        user_id = get_jwt_identity()
        
        # Debug: Print received data
        print(f"Received request for membership purchase. User ID: {user_id}")
        
        # Get plan type from request data with more robust error handling
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
            
        plan_type = data.get('plan_type')
        print(f"Plan type: {plan_type}")
        
        if not plan_type:
            print("Error: Missing plan_type")
            return jsonify({
                'error': 'Missing plan type', 
                'message': 'Plan type must be specified'
            }), 400
            
        if plan_type not in ['monthly', 'yearly']:
            print(f"Error: Invalid plan type: {plan_type}")
            return jsonify({
                'error': 'Invalid plan type', 
                'message': 'Plan type must be either "monthly" or "yearly"'
            }), 400
        
        # Process the membership purchase
        result = process_membership_purchase(user_id, plan_type)
        print(f"Membership purchase result: {result}")
        
        # Check if an error occurred
        if isinstance(result, tuple) and len(result) > 1 and isinstance(result[0], dict) and 'error' in result[0]:
            return jsonify(result[0]), result[1]
        
        return jsonify({
            'success': True,
            'message': f'Successfully purchased {plan_type} membership',
            'membership': result
        })
        
    except Exception as e:
        print(f"Error processing membership purchase: {str(e)}")
        return jsonify({
            'error': 'Failed to process payment',
            'message': str(e)
        }), 500

@membership_bp.route('/config/file-size-limit', methods=['GET'])
def get_file_size_limit():
    """
    Returns the maximum file size allowed for free/guest users.
    This endpoint is public and doesn't require authentication.
    
    Returns:
        JSON response with maxFileSizeMB field
    """
    try:
        return jsonify({
            'maxFileSizeMB': config.GUEST_FREE_USER_MAX_FILE_SIZE
        })
    except Exception as e:
        print(f"Error getting file size limit: {str(e)}")
        return jsonify({
            'error': 'Failed to get file size limit',
            'message': str(e),
            'maxFileSizeMB': 50  # Default fallback value
        }), 500

@membership_bp.route('/api/config/character-limit', methods=['GET'])
def get_character_limit():
    """
    Returns the paid user character monthly limit from config.
    This endpoint is public and doesn't require authentication.
    
    Returns:
        JSON response with limit field
    """
    try:
        return jsonify({
            'limit': config.PAID_USER_CHARACTER_MONTHLY_LIMIT
        })
    except Exception as e:
        print(f"Error getting character limit: {str(e)}")
        return jsonify({
            'error': 'Failed to get character limit',
            'message': str(e),
            'limit': 5000000  # Default fallback value
        }), 500

@membership_bp.route('/api/config/limits', methods=['GET'])
def get_all_limits():
    """
    Returns all relevant configuration limits from config.py.
    This endpoint is public and doesn't require authentication.
    
    Returns:
        JSON response with all limit fields
    """
    try:
        return jsonify({
            'freeUserCharPerFileLimit': config.FREE_USER_CHARACTER_PER_FILE_LIMIT,
            'freeUserCharMonthlyLimit': config.FREE_USER_CHARACTER_MONTHLY_LIMIT,
            'freeUserTranslationLimit': config.FREE_USER_TRANSLATION_LIMIT,
            'freeUserTranslationPeriod': config.FREE_USER_TRANSLATION_PERIOD,
            'paidUserCharMonthlyLimit': config.PAID_USER_CHARACTER_MONTHLY_LIMIT,
            'maxFileSizeMB': config.GUEST_FREE_USER_MAX_FILE_SIZE
        })
    except Exception as e:
        print(f"Error getting configuration limits: {str(e)}")
        return jsonify({
            'error': 'Failed to get configuration limits',
            'message': str(e),
            # Fallback values
            'freeUserCharPerFileLimit': 25000,
            'freeUserCharMonthlyLimit': 100000,
            'freeUserTranslationLimit': 1,
            'freeUserTranslationPeriod': 'weekly',
            'paidUserCharMonthlyLimit': 5000000,
            'maxFileSizeMB': 50
        }), 500 