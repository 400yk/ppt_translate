"""
API endpoints for handling referral-related operations.
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from db.models import User, Referral, db
from config import REFERRAL_FEATURE_PAID_MEMBERS_ONLY, MAX_REFERRALS_PER_USER, REFERRAL_REWARD_DAYS
import datetime

referral_bp = Blueprint('referral', __name__)

@referral_bp.route('/api/referrals/generate', methods=['POST'])
@jwt_required()
def generate_referral_link():
    """
    Generate a referral link for the authenticated user.
    
    Returns:
    {
        "success": True,
        "referral_code": "ABC123XYZ789",
        "referral_link": "https://domain.com/register?ref=ABC123XYZ789",
        "expires_at": "2025-01-15T10:30:00"
    }
    """
    try:
        username = get_jwt_identity()
        print(f"Generating referral link for user: {username}")
        
        # Find user by username
        user = User.query.filter_by(username=username).first()
        
        if not user:
            print(f"User not found: {username}")
            return jsonify({
                'error': 'User not found',
                'errorKey': 'errors.user_not_found'
            }), 404
        
        # Check if user is eligible to generate referral codes
        if not user.can_generate_referral_codes():
            if REFERRAL_FEATURE_PAID_MEMBERS_ONLY:
                return jsonify({
                    'error': 'Only users with active membership can generate referral codes',
                    'errorKey': 'errors.referral_membership_required'
                }), 403
            else:
                return jsonify({
                    'error': 'You are not eligible to generate referral codes',
                    'errorKey': 'errors.referral_not_eligible'
                }), 403
        
        # Check if user has reached the maximum number of referrals
        existing_referrals_count = Referral.query.filter_by(referrer_user_id=user.id).count()
        if existing_referrals_count >= MAX_REFERRALS_PER_USER:
            return jsonify({
                'error': f'You have reached the maximum limit of {MAX_REFERRALS_PER_USER} referrals',
                'errorKey': 'errors.referral_limit_reached'
            }), 400
        
        # Get request data
        if not request.is_json:
            return jsonify({
                'error': 'Request must be in JSON format', 
                'errorKey': 'errors.invalid_request_format'
            }), 400
            
        data = request.get_json()
        referee_email = data.get('referee_email')
        
        if not referee_email:
            return jsonify({
                'error': 'Referee email is required',
                'errorKey': 'errors.missing_referee_email'
            }), 400
        
        # Validate email format
        import re
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, referee_email):
            return jsonify({
                'error': 'Please provide a valid email address',
                'errorKey': 'errors.invalid_email_format'
            }), 400
        
        # Check if this email has already been referred by this user
        existing_referral = Referral.query.filter_by(
            referrer_user_id=user.id, 
            referee_email=referee_email
        ).first()
        
        if existing_referral:
            # If referral exists and is still valid, return the existing one
            if existing_referral.is_valid():
                # Construct referral link
                from config import FLASK_API_URL
                base_url = FLASK_API_URL.replace('/api', '') if FLASK_API_URL.endswith('/api') else FLASK_API_URL
                referral_link = f"{base_url}/register?ref={existing_referral.referral_code}"
                
                return jsonify({
                    'success': True,
                    'referral_code': existing_referral.referral_code,
                    'referral_link': referral_link,
                    'expires_at': existing_referral.expires_at.isoformat(),
                    'message': 'Using existing referral for this email',
                    'messageKey': 'referral.using_existing'
                })
            else:
                return jsonify({
                    'error': 'This email has already been referred and the referral has expired or been used',
                    'errorKey': 'errors.referral_already_exists'
                }), 400
        
        # Create new referral
        referral = Referral(
            referrer_user_id=user.id,
            referee_email=referee_email
        )
        
        db.session.add(referral)
        db.session.commit()
        
        # Construct referral link
        from config import FLASK_API_URL
        base_url = FLASK_API_URL.replace('/api', '') if FLASK_API_URL.endswith('/api') else FLASK_API_URL
        referral_link = f"{base_url}/register?ref={referral.referral_code}"
        
        print(f"Generated referral link: {referral_link}")
        
        return jsonify({
            'success': True,
            'referral_code': referral.referral_code,
            'referral_link': referral_link,
            'expires_at': referral.expires_at.isoformat(),
            'referee_email': referee_email,
            'message': 'Referral link generated successfully',
            'messageKey': 'referral.link_generated'
        })
        
    except Exception as e:
        print(f"Error generating referral link: {str(e)}")
        db.session.rollback()
        return jsonify({
            'error': 'Failed to generate referral link',
            'errorKey': 'errors.referral_generation_failed',
            'message': str(e)
        }), 500 

@referral_bp.route('/api/referrals/track/<referral_code>', methods=['GET'])
def track_referral_code(referral_code):
    """
    Track a referral code and return its status.
    This endpoint is public (no authentication required) for registration process.
    
    Returns:
    {
        "valid": True,
        "referrer_username": "john_doe",
        "expires_at": "2025-01-15T10:30:00",
        "status": "pending"
    }
    """
    try:
        # Find referral by code
        referral = Referral.query.filter_by(referral_code=referral_code).first()
        
        if not referral:
            return jsonify({
                'valid': False,
                'error': 'Referral code not found',
                'errorKey': 'errors.referral_code_not_found'
            }), 404
        
        # Check if referral is still valid
        if not referral.is_valid():
            return jsonify({
                'valid': False,
                'error': 'Referral code has expired or been used',
                'errorKey': 'errors.referral_code_expired',
                'status': referral.status
            }), 400
        
        # Get referrer information
        referrer = User.query.get(referral.referrer_user_id)
        if not referrer:
            return jsonify({
                'valid': False,
                'error': 'Referrer not found',
                'errorKey': 'errors.referrer_not_found'
            }), 404
        
        return jsonify({
            'valid': True,
            'referrer_username': referrer.username,
            'referee_email': referral.referee_email,
            'expires_at': referral.expires_at.isoformat(),
            'status': referral.status,
            'reward_days': REFERRAL_REWARD_DAYS,
            'message': 'Valid referral code',
            'messageKey': 'referral.code_valid'
        })
        
    except Exception as e:
        print(f"Error tracking referral code: {str(e)}")
        return jsonify({
            'valid': False,
            'error': 'Failed to track referral code',
            'errorKey': 'errors.referral_tracking_failed',
            'message': str(e)
        }), 500

@referral_bp.route('/api/referrals/my-referrals', methods=['GET'])
@jwt_required()
def get_my_referrals():
    """
    Get all referrals created by the authenticated user.
    
    Returns:
    {
        "success": True,
        "referrals": [
            {
                "id": 1,
                "referee_email": "friend@example.com",
                "referral_code": "ABC123XYZ789",
                "status": "pending",
                "created_at": "2025-01-01T10:30:00",
                "expires_at": "2025-01-15T10:30:00",
                "reward_claimed": False
            }
        ],
        "total_count": 5,
        "pending_count": 2,
        "completed_count": 3
    }
    """
    try:
        username = get_jwt_identity()
        user = User.query.filter_by(username=username).first()
        
        if not user:
            return jsonify({
                'error': 'User not found',
                'errorKey': 'errors.user_not_found'
            }), 404
        
        # Get all referrals by this user
        referrals = Referral.query.filter_by(referrer_user_id=user.id).order_by(Referral.created_at.desc()).all()
        
        # Build response data
        referral_list = []
        pending_count = 0
        completed_count = 0
        
        for referral in referrals:
            referee_user = None
            if referral.referee_user_id:
                referee_user = User.query.get(referral.referee_user_id)
            
            referral_data = {
                'id': referral.id,
                'referee_email': referral.referee_email,
                'referral_code': referral.referral_code,
                'status': referral.status,
                'created_at': referral.created_at.isoformat(),
                'expires_at': referral.expires_at.isoformat(),
                'completed_at': referral.completed_at.isoformat() if referral.completed_at else None,
                'reward_claimed': referral.reward_claimed,
                'referee_username': referee_user.username if referee_user else None
            }
            
            referral_list.append(referral_data)
            
            # Count statuses
            if referral.status == 'pending':
                pending_count += 1
            elif referral.status == 'completed':
                completed_count += 1
        
        return jsonify({
            'success': True,
            'referrals': referral_list,
            'total_count': len(referrals),
            'pending_count': pending_count,
            'completed_count': completed_count,
            'remaining_referrals': max(0, MAX_REFERRALS_PER_USER - len(referrals))
        })
        
    except Exception as e:
        print(f"Error getting user referrals: {str(e)}")
        return jsonify({
            'error': 'Failed to get referrals',
            'errorKey': 'errors.referrals_fetch_failed',
            'message': str(e)
        }), 500

@referral_bp.route('/api/referrals/claim-reward', methods=['POST'])
@jwt_required()
def claim_referral_reward():
    """
    Claim rewards for completed referrals.
    
    Request body:
    {
        "referral_id": 123  // Optional: specific referral ID to claim
    }
    
    Returns:
    {
        "success": True,
        "rewards_claimed": 2,
        "total_days_added": 6,
        "new_membership_end": "2025-02-15T10:30:00"
    }
    """
    try:
        username = get_jwt_identity()
        user = User.query.filter_by(username=username).first()
        
        if not user:
            return jsonify({
                'error': 'User not found',
                'errorKey': 'errors.user_not_found'
            }), 404
        
        data = request.get_json() if request.is_json else {}
        referral_id = data.get('referral_id')
        
        # If specific referral ID provided, claim just that one
        if referral_id:
            referral = Referral.query.filter_by(
                id=referral_id, 
                referrer_user_id=user.id
            ).first()
            
            if not referral:
                return jsonify({
                    'error': 'Referral not found',
                    'errorKey': 'errors.referral_not_found'
                }), 404
            
            if referral.status != 'completed':
                return jsonify({
                    'error': 'Referral is not completed yet',
                    'errorKey': 'errors.referral_not_completed'
                }), 400
            
            if referral.reward_claimed:
                return jsonify({
                    'error': 'Reward already claimed for this referral',
                    'errorKey': 'errors.reward_already_claimed'
                }), 400
            
            referrals_to_claim = [referral]
        else:
            # Claim all unclaimed completed referrals
            referrals_to_claim = Referral.query.filter_by(
                referrer_user_id=user.id,
                status='completed',
                reward_claimed=False
            ).all()
        
        if not referrals_to_claim:
            return jsonify({
                'error': 'No rewards available to claim',
                'errorKey': 'errors.no_rewards_available'
            }), 400
        
        # Calculate total rewards
        total_days = len(referrals_to_claim) * REFERRAL_REWARD_DAYS
        
        # Add bonus membership days
        user.add_bonus_membership_days(total_days)
        
        # Mark referrals as reward claimed
        for referral in referrals_to_claim:
            referral.reward_claimed = True
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'rewards_claimed': len(referrals_to_claim),
            'total_days_added': total_days,
            'new_membership_end': user.membership_end.isoformat() if user.membership_end else None,
            'bonus_days_total': user.bonus_membership_days,
            'message': f'Successfully claimed {len(referrals_to_claim)} referral rewards',
            'messageKey': 'referral.rewards_claimed'
        })
        
    except Exception as e:
        print(f"Error claiming referral rewards: {str(e)}")
        db.session.rollback()
        return jsonify({
            'error': 'Failed to claim rewards',
            'errorKey': 'errors.reward_claim_failed',
            'message': str(e)
        }), 500 