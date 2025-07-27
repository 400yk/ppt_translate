"""
API endpoints for handling user authentication and invitation codes.
"""

from flask import Blueprint, jsonify, request, redirect, url_for
from flask_jwt_extended import jwt_required, create_access_token, get_jwt_identity
import datetime
from db.models import db, User, InvitationCode, Referral
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import os # For accessing environment variables
from services.email_service import email_service
from config import REQUIRE_EMAIL_VERIFICATION, SKIP_EMAIL_VERIFICATION_FOR_GOOGLE_AUTH, FRONTEND_URL, REFERRAL_REWARD_DAYS

auth_bp = Blueprint('auth', __name__)

# Your Google Client ID from environment variable
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_OAUTH_CLIENT_ID")

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
    invitation_code_str = data.get('invitation_code')  # This can be None now, or could be referral code
    
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
    
    # Variables to track code usage
    has_valid_invitation = False
    has_valid_referral = False
    invitation_code = None
    referral = None
    code_type = None
    
    # Handle code (could be invitation code or referral code)
    if invitation_code_str:
        # First check if it's a referral code
        referral = Referral.query.filter_by(referral_code=invitation_code_str).first()
        
        if referral:
            code_type = 'referral'
            # Validate referral code (Option B: first come, first served)
            if not referral.is_valid():
                if referral.is_expired():
                    return jsonify({
                        'error': 'Referral code has expired',
                        'errorKey': 'errors.referral_code_expired'
                    }), 400
                elif referral.referee_user_id or referral.status == 'completed':
                    return jsonify({
                        'error': 'Referral code has already been used',
                        'errorKey': 'errors.referral_code_used'
                    }), 400
                else:
                    return jsonify({
                        'error': 'Invalid referral code',
                        'errorKey': 'errors.code_invalid'
                    }), 400
            
            # Check that this email hasn't been referred by ANYONE else (prevent double-referrals)
            existing_referral_for_email = Referral.query.filter(
                Referral.referee_email == email,
                Referral.status == 'completed'
            ).first()
            if existing_referral_for_email:
                return jsonify({
                    'error': 'This email has already been referred by another user',
                    'errorKey': 'errors.email_already_referred'
                }), 400
            
            # Check that this user hasn't already been referred before
            existing_user_referral = User.query.filter_by(email=email).first()
            if existing_user_referral and existing_user_referral.referred_by_code:
                return jsonify({
                    'error': 'You have already been referred before',
                    'errorKey': 'errors.user_already_referred'
                }), 400
            
            # Check for self-referral
            referrer = User.query.get(referral.referrer_user_id)
            if referrer and referrer.email == email:
                return jsonify({
                    'error': 'You cannot refer yourself',
                    'errorKey': 'errors.self_referral'
                }), 400
            
            has_valid_referral = True
        else:
            # Check if it's an invitation code
            invitation_code = InvitationCode.query.filter_by(code=invitation_code_str).first()
            if invitation_code:
                code_type = 'invitation'
                if invitation_code.is_valid():
                    has_valid_invitation = True
                else:
                    return jsonify({
                        'error': 'Invitation code has already been used',
                        'errorKey': 'errors.code_already_used'
                    }), 400
            else:
                # Code not found in either table
                return jsonify({
                    'error': 'Invalid invitation or referral code',
                    'errorKey': 'errors.code_invalid'
                }), 400
    
    # Create new user
    user = User(username=username, email=email, invitation_code=invitation_code)
    user.set_password(password)
    
    # Handle referral code
    if has_valid_referral and referral:
        # Complete the referral (first come, first served for Option B)
        if referral.complete_referral(user):
            # Set the referred_by_code for the new user
            user.referred_by_code = referral.referral_code
            
            # DON'T award bonus membership days yet - wait for email verification
            referrer = User.query.get(referral.referrer_user_id)
            print(f"Referral completed: {referrer.username if referrer else 'Unknown'} referred {user.username}")
            print(f"Bonus days will be awarded after email verification")
        else:
            return jsonify({
                'error': 'Failed to complete referral',
                'errorKey': 'errors.referral_completion_failed'
            }), 500
    
    # Handle invitation code (existing logic)
    if has_valid_invitation and invitation_code:
        invitation_code.mark_as_used()
        # Activate membership for the new user with invitation code
        user.activate_paid_membership(is_invitation=True)
        print(f"Activated invitation-based membership for {user.username} until {user.membership_end}")
    
    # Handle email verification
    if REQUIRE_EMAIL_VERIFICATION:
        # Generate email verification token
        verification_token = user.generate_email_verification_token()
        
        # Get locale from request (from Accept-Language header or explicit locale parameter)
        locale = data.get('locale') or request.headers.get('Accept-Language', 'en').split(',')[0].split('-')[0]
        # Validate and fallback to 'en' if invalid
        valid_locales = ['en', 'zh', 'zh_hk', 'es', 'fr', 'de', 'ja', 'ko', 'ru']
        if locale not in valid_locales:
            locale = 'en'
        
        # Send verification email
        email_sent = email_service.send_verification_email(
            user_email=email,
            username=username,
            verification_token=verification_token,
            locale=locale
        )
        
        if not email_sent:
            return jsonify({
                'error': 'Failed to send verification email',
                'errorKey': 'errors.email_send_failed'
            }), 500
    else:
        # Skip email verification if disabled
        user.is_email_verified = True
        
        # Award referral bonus days immediately if email verification is disabled
        if has_valid_referral and referral and not referral.reward_claimed:
            user.add_bonus_membership_days(REFERRAL_REWARD_DAYS)  # Award to referee
            referrer = User.query.get(referral.referrer_user_id)
            if referrer:
                referrer.add_bonus_membership_days(REFERRAL_REWARD_DAYS)  # Award to referrer
            
            # Mark rewards as claimed
            referral.reward_claimed = True
            print(f"Referral rewards awarded immediately: {referrer.username if referrer else 'Unknown'} and {user.username} both got {REFERRAL_REWARD_DAYS} bonus days")
    
    # Save user to database
    db.session.add(user)
    db.session.commit()
    
    # Generate access token only if email is verified or verification is disabled
    access_token = None
    if user.is_email_verified:
        access_token = create_access_token(identity=username)
    
    response_data = {
        'message': 'User registered successfully',
        'messageKey': 'auth.register_success',
        'has_invitation': has_valid_invitation,
        'has_referral': has_valid_referral,
        'code_type': code_type,
        'email_verification_required': REQUIRE_EMAIL_VERIFICATION and not user.is_email_verified
    }
    
    # Add specific messages for code types
    if has_valid_referral:
        response_data['referral_message'] = f'You and your referrer both earned {REFERRAL_REWARD_DAYS} bonus days!'
        response_data['bonus_days'] = REFERRAL_REWARD_DAYS
    elif has_valid_invitation:
        response_data['invitation_message'] = 'You have been activated with invitation membership!'
    
    if access_token:
        response_data['access_token'] = access_token
    
    return jsonify(response_data), 201

@auth_bp.route('/api/verify-email', methods=['GET'])
def verify_email():
    """Verify user's email address using token from email link."""
    token = request.args.get('token')
    
    if not token:
        # Redirect to frontend with error
        return redirect(f"{FRONTEND_URL}/verify-email?error=missing_token")
    
    # Find user by verification token
    user = User.query.filter_by(email_verification_token=token).first()
    
    if not user:
        # Redirect to frontend with error
        return redirect(f"{FRONTEND_URL}/verify-email?error=invalid_token")
    
    # Verify the token
    if user.verify_email_token(token):
        # Check if this user was referred and award bonus days
        if user.referred_by_code:
            # Find the referral record
            referral = Referral.query.filter_by(referral_code=user.referred_by_code).first()
            if referral and referral.status == 'completed' and not referral.reward_claimed:
                # Award bonus days to both users now that email is verified
                user.add_bonus_membership_days(REFERRAL_REWARD_DAYS)  # Award to referee
                referrer = User.query.get(referral.referrer_user_id)
                if referrer:
                    referrer.add_bonus_membership_days(REFERRAL_REWARD_DAYS)  # Award to referrer
                
                # Mark rewards as claimed
                referral.reward_claimed = True
                db.session.commit()
                
                print(f"Referral rewards awarded: {referrer.username if referrer else 'Unknown'} and {user.username} both got {REFERRAL_REWARD_DAYS} bonus days")
        
        # Generate access token now that email is verified
        access_token = create_access_token(identity=user.username)
        
        # Redirect to frontend with success and token
        return redirect(f"{FRONTEND_URL}/verify-email?success=true&token={access_token}&username={user.username}")
    else:
        # Redirect to frontend with error
        return redirect(f"{FRONTEND_URL}/verify-email?error=token_expired")

@auth_bp.route('/api/resend-verification', methods=['POST'])
def resend_verification_email():
    """Resend email verification for a user."""
    data = request.get_json()
    
    if not data or not data.get('email'):
        return jsonify({
            'error': 'Email is required',
            'errorKey': 'errors.missing_email'
        }), 400
    
    email = data.get('email')
    user = User.query.filter_by(email=email).first()
    
    if not user:
        return jsonify({
            'error': 'User not found',
            'errorKey': 'errors.user_not_found'
        }), 404
    
    if user.is_email_verified:
        return jsonify({
            'error': 'Email is already verified',
            'errorKey': 'errors.email_already_verified'
        }), 400
    
    # Check cooldown period
    if not user.can_resend_verification_email():
        return jsonify({
            'error': 'Please wait before requesting another verification email',
            'errorKey': 'errors.verification_cooldown'
        }), 429
    
    # Generate new verification token
    verification_token = user.generate_email_verification_token()
    
    # Get locale from request
    locale = data.get('locale') or request.headers.get('Accept-Language', 'en').split(',')[0].split('-')[0]
    # Validate and fallback to 'en' if invalid
    valid_locales = ['en', 'zh', 'zh_hk', 'es', 'fr', 'de', 'ja', 'ko', 'ru']
    if locale not in valid_locales:
        locale = 'en'
    
    # Send verification email
    email_sent = email_service.send_verification_email(
        user_email=email,
        username=user.username,
        verification_token=verification_token,
        locale=locale
    )
    
    if email_sent:
        return jsonify({
            'success': True,
            'message': 'Verification email sent',
            'messageKey': 'auth.verification_sent'
        })
    else:
        return jsonify({
            'error': 'Failed to send verification email',
            'errorKey': 'errors.email_send_failed'
        }), 500

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
    
    # Check if email verification is required
    if REQUIRE_EMAIL_VERIFICATION and not user.is_email_verified:
        return jsonify({
            'error': 'Email verification required',
            'errorKey': 'errors.email_not_verified',
            'email_verification_required': True
        }), 403
    
    # Update last login time
    user.last_login = datetime.datetime.utcnow()
    db.session.commit()
    
    # Generate access token
    access_token = create_access_token(identity=username)
    
    # Check if the user has a valid invitation code
    has_invitation = user.invitation_code is not None and user.invitation_code.is_valid()
    
    # Check admin status
    is_admin = user.is_administrator()
    
    return jsonify({
        'message': 'Login successful',
        'messageKey': 'auth.login_success',
        'has_invitation': has_invitation,
        'access_token': access_token,
        'is_admin': is_admin
    }), 200

@auth_bp.route('/api/auth/google', methods=['POST'])
def google_auth():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided in request', 'errorKey': 'errors.no_data_provided'}), 400
        
        google_token = data.get('credential')
        invitation_code_str = data.get('invitation_code')  # Optional invitation code or referral code
        
        if not google_token:
            return jsonify({'error': 'No Google credential received', 'errorKey': 'errors.google_no_credential'}), 400
        
        # Verify the Google token
        id_info = id_token.verify_oauth2_token(
            google_token, 
            google_requests.Request(), 
            GOOGLE_CLIENT_ID
        )
        
        # Extract user information from Google
        google_id = id_info['sub']
        email = id_info['email']
        username = id_info.get('name', email.split('@')[0])  # Use name or fallback to email prefix
        
        # Check if user already exists with this Google ID
        user = User.query.filter_by(google_id=google_id).first()
        
        # If not found by Google ID, check by email
        if not user:
            user = User.query.filter_by(email=email).first()
            if user:
                # Link this Google account to existing user
                user.google_id = google_id
                # user.google_access_token = google_token
                # Google OAuth users have verified emails
                if SKIP_EMAIL_VERIFICATION_FOR_GOOGLE_AUTH:
                    user.is_email_verified = True
        
        # Variables to track code usage
        has_valid_invitation = False
        has_valid_referral = False
        invitation_code = None
        referral = None
        code_type = None
        
        if not user:
            # User doesn't exist, create a new one
            
            # Handle potential username conflicts
            base_username = username
            counter = 1
            while User.query.filter_by(username=username).first():
                username = f"{base_username}{counter}"
                counter += 1
            
            # Verify code if provided (could be invitation code or referral code)
            if invitation_code_str:
                # First check if it's a referral code
                referral = Referral.query.filter_by(referral_code=invitation_code_str).first()
                
                if referral:
                    code_type = 'referral'
                    # Validate referral code
                    if not referral.is_valid():
                        if referral.is_expired():
                            return jsonify({
                                'error': 'Referral code has expired',
                                'errorKey': 'errors.referral_code_expired'
                            }), 400
                        elif referral.referee_user_id or referral.status == 'completed':
                            return jsonify({
                                'error': 'Referral code has already been used',
                                'errorKey': 'errors.referral_code_used'
                            }), 400
                        else:
                            return jsonify({
                                'error': 'Invalid referral code',
                                'errorKey': 'errors.code_invalid'
                            }), 400
                    
                    # Check that this email hasn't been referred by ANYONE else
                    existing_referral_for_email = Referral.query.filter(
                        Referral.referee_email == email,
                        Referral.status == 'completed'
                    ).first()
                    if existing_referral_for_email:
                        return jsonify({
                            'error': 'This email has already been referred by another user',
                            'errorKey': 'errors.email_already_referred'
                        }), 400
                    
                    # Check for self-referral
                    referrer = User.query.get(referral.referrer_user_id)
                    if referrer and referrer.email == email:
                        return jsonify({
                            'error': 'You cannot refer yourself',
                            'errorKey': 'errors.self_referral'
                        }), 400
                    
                    has_valid_referral = True
                else:
                    # Check if it's an invitation code
                    invitation_code = InvitationCode.query.filter_by(code=invitation_code_str).first()
                    if invitation_code:
                        code_type = 'invitation'
                        if invitation_code.is_valid():
                            has_valid_invitation = True
                        else:
                            return jsonify({
                                'error': 'Invitation code has already been used',
                                'errorKey': 'errors.code_already_used'
                            }), 400
                    else:
                        # Code not found in either table
                        return jsonify({
                            'error': 'Invalid invitation or referral code',
                            'errorKey': 'errors.code_invalid'
                        }), 400
            
            user = User(
                username=username,
                email=email,
                google_id=google_id,
                # google_access_token=google_token,
                invitation_code=invitation_code
            )
            
            # Google OAuth users have verified emails by default
            if SKIP_EMAIL_VERIFICATION_FOR_GOOGLE_AUTH:
                user.is_email_verified = True
            
            # Handle referral code
            if has_valid_referral and referral:
                # Complete the referral
                if referral.complete_referral(user):
                    # Set the referred_by_code for the new user
                    user.referred_by_code = referral.referral_code
                    
                    # Award bonus days immediately since Google OAuth users have verified emails by default
                    if SKIP_EMAIL_VERIFICATION_FOR_GOOGLE_AUTH and not referral.reward_claimed:
                        user.add_bonus_membership_days(REFERRAL_REWARD_DAYS)  # Award to referee
                        referrer = User.query.get(referral.referrer_user_id)
                        if referrer:
                            referrer.add_bonus_membership_days(REFERRAL_REWARD_DAYS)  # Award to referrer
                        
                        # Mark rewards as claimed
                        referral.reward_claimed = True
                        print(f"Referral rewards awarded immediately for Google user: {referrer.username if referrer else 'Unknown'} and {user.username} both got {REFERRAL_REWARD_DAYS} bonus days")
                    else:
                        print(f"Referral completed for Google user: {user.username}, bonus days will be awarded after email verification")
                else:
                    return jsonify({
                        'error': 'Failed to complete referral',
                        'errorKey': 'errors.referral_completion_failed'
                    }), 500
            
            # Handle invitation code (existing logic)
            if has_valid_invitation and invitation_code:
                invitation_code.mark_as_used()
                # Activate membership for the new user with invitation code
                user.activate_paid_membership(is_invitation=True)
                print(f"Activated invitation-based membership for Google user {user.username} until {user.membership_end}")
            
            db.session.add(user)
        else:
            # Existing user, handle code if provided (could be invitation or referral)
            if invitation_code_str:
                # First check if it's a referral code
                referral = Referral.query.filter_by(referral_code=invitation_code_str).first()
                
                if referral:
                    code_type = 'referral'
                    # Check if this user hasn't already been referred
                    if user.referred_by_code:
                        return jsonify({
                            'error': 'You have already been referred before',
                            'errorKey': 'errors.user_already_referred'
                        }), 400
                    
                    # Validate referral code
                    if not referral.is_valid():
                        if referral.is_expired():
                            return jsonify({
                                'error': 'Referral code has expired',
                                'errorKey': 'errors.referral_code_expired'
                            }), 400
                        elif referral.referee_user_id or referral.status == 'completed':
                            return jsonify({
                                'error': 'Referral code has already been used',
                                'errorKey': 'errors.referral_code_used'
                            }), 400
                        else:
                            return jsonify({
                                'error': 'Invalid referral code',
                                'errorKey': 'errors.code_invalid'
                            }), 400
                    
                    # Check for self-referral
                    referrer = User.query.get(referral.referrer_user_id)
                    if referrer and referrer.email == user.email:
                        return jsonify({
                            'error': 'You cannot refer yourself',
                            'errorKey': 'errors.self_referral'
                        }), 400
                    
                    # Complete the referral for existing user
                    if referral.complete_referral(user):
                        user.referred_by_code = referral.referral_code
                        
                        # Award bonus days immediately since Google OAuth users have verified emails
                        if SKIP_EMAIL_VERIFICATION_FOR_GOOGLE_AUTH and not referral.reward_claimed:
                            user.add_bonus_membership_days(REFERRAL_REWARD_DAYS)  # Award to referee
                            if referrer:
                                referrer.add_bonus_membership_days(REFERRAL_REWARD_DAYS)  # Award to referrer
                            
                            # Mark rewards as claimed
                            referral.reward_claimed = True
                            print(f"Referral rewards awarded to existing Google user: {referrer.username if referrer else 'Unknown'} and {user.username} both got {REFERRAL_REWARD_DAYS} bonus days")
                        
                        has_valid_referral = True
                    else:
                        return jsonify({
                            'error': 'Failed to complete referral',
                            'errorKey': 'errors.referral_completion_failed'
                        }), 500
                else:
                    # Check if it's an invitation code
                    invitation_code = InvitationCode.query.filter_by(code=invitation_code_str).first()
                    if invitation_code and invitation_code.is_valid():
                        has_valid_invitation = True
                        code_type = 'invitation'
                        # Only assign invitation code if user doesn't already have one
                        if not user.invitation_code:
                            user.invitation_code = invitation_code
                            invitation_code.mark_as_used()
                            # Activate membership for the user with invitation code
                            user.activate_paid_membership(is_invitation=True)
                            print(f"Activated invitation-based membership for existing Google user {user.username} until {user.membership_end}")
                    elif invitation_code_str:  # Code was provided but is invalid
                        if not invitation_code:
                            return jsonify({
                                'error': 'Invalid invitation or referral code',
                                'errorKey': 'errors.code_invalid'
                            }), 400
                        else:
                            return jsonify({
                                'error': 'Invitation code has already been used',
                                'errorKey': 'errors.code_already_used'
                            }), 400

        # Update last login time for the user (either existing or newly created/linked)
        user.last_login = datetime.datetime.utcnow()
        db.session.commit()

        # Generate access token for your application
        # Use user.username or user.id as identity, consistent with your regular login
        access_token = create_access_token(identity=user.username)
        
        return jsonify({
            'message': 'Google Sign-In successful',
            'access_token': access_token,
            'has_invitation': has_valid_invitation,
            'has_referral': has_valid_referral,
            'code_type': code_type,
            'user': { # Return some user info to the frontend
                'username': user.username,
                'email': user.email,
                # Add other relevant user fields if needed
            }
        }), 200

    except ValueError as e:
        # Invalid token
        print(f"Google Auth Error: Invalid token - {str(e)}")
        return jsonify({'error': 'Invalid Google token', 'errorKey': 'errors.invalid_google_token'}), 401
    except Exception as e:
        print(f"Google Auth Error: {str(e)}")
        return jsonify({'error': 'An error occurred during Google authentication', 'errorKey': 'errors.google_auth_failed'}), 500

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
    codes_batch = InvitationCode.generate_batch(count=50)
    created_codes = []
    
    for code_value in codes_batch:
        new_code = InvitationCode(
            code=code_value,
            active=True
        )
        db.session.add(new_code)
        created_codes.append(new_code)
    
    db.session.commit()
    
    return jsonify({
        'message': 'Invitation codes generated successfully',
        'codes': [code.code for code in created_codes]
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
    
    # Use the new admin role system
    is_admin = user.is_administrator()
    
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
        
    # Use the new admin role system
    is_admin = user.is_administrator()
    
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