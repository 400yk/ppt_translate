"""
User management module for handling user permissions, translation limits, and memberships.
"""

import datetime
from flask import jsonify
from models import User, TranslationRecord, db
from config import FREE_USER_TRANSLATION_LIMIT, FREE_USER_TRANSLATION_PERIOD, GUEST_TRANSLATION_LIMIT
from services.guest_service import guest_tracker
from utils.api_utils import error_response

def check_user_permission(user):
    """
    Check if a user has permission to perform a translation.
    
    Args:
        user: The User object to check
        
    Returns:
        (allowed, error_response) where allowed is a boolean indicating if the user can translate,
        and error_response is the Flask response to return if not allowed (or None if allowed).
    """
    # Check if user is a paid member
    if user.is_membership_active():
        print(f"User {user.username} has an active membership. Days remaining: {user.get_membership_days_remaining()}")
        
        # Check character limit for paid users
        if user.monthly_characters_used >= user.get_character_limit():
            return False, error_response(
                'Monthly character limit reached',
                'pricing.character_limit_title',
                403
            )
        
        return True, None
        
    # Check if user has a valid invitation code
    elif user.invitation_code:
        # Check if the invitation code is valid
        if user.invitation_code.is_valid():
            user.invitation_code.mark_as_used()
            print(f"Marked invitation code as used: {user.invitation_code.code}")
            
            # If this is their first use of the invitation code, activate their membership
            if user.is_paid_user is False and user.membership_start is None:
                user.activate_paid_membership(is_invitation=True)
                print(f"Activated invitation-based membership for {user.username} until {user.membership_end}")
            
            # Check character limit even for invitation users
            if user.monthly_characters_used >= user.get_character_limit():
                return False, error_response(
                    'Monthly character limit reached',
                    'pricing.character_limit_title',
                    403
                )
            
            return True, None
        else:
            return False, error_response(
                'Your invitation code has already been used or has been deactivated',
                'errors.code_already_used',
                403
            )
        
    # Check free user translation limits
    else:
        # First check free user weekly/monthly translation limit
        print(f"Free user, checking {FREE_USER_TRANSLATION_PERIOD} limit of {FREE_USER_TRANSLATION_LIMIT}")
        
        period_start, period_name = get_period_start()
        
        # Count translations in the current period
        period_count = TranslationRecord.query.filter(
            TranslationRecord.user_id == user.id,
            TranslationRecord.created_at >= period_start
        ).count()
        
        if period_count >= FREE_USER_TRANSLATION_LIMIT:
            # User has already used their quota
            return False, error_response(
                f'{period_name.capitalize()} translation limit reached',
                'pricing.weekly_limit_title',
                403
            )
        
        # Then check character limit for free users
        if user.monthly_characters_used >= user.get_character_limit():
            return False, error_response(
                'Monthly character limit reached',
                'pricing.character_limit_title',
                403
            )
        
        print(f"User has used {period_count}/{FREE_USER_TRANSLATION_LIMIT} translations this {period_name}")
        print(f"User has used {user.monthly_characters_used}/{user.get_character_limit()} characters this month")
        return True, None

def get_period_start():
    """
    Get the start datetime and name of the current period based on FREE_USER_TRANSLATION_PERIOD.
    
    Returns:
        (period_start, period_name) tuple
    """
    if FREE_USER_TRANSLATION_PERIOD == 'daily':
        # Get the start of the current day (00:00:00)
        today = datetime.datetime.now()
        period_start = today.replace(hour=0, minute=0, second=0, microsecond=0)
        period_name = "day"
    elif FREE_USER_TRANSLATION_PERIOD == 'weekly':
        # Get the start of the current week (Monday 00:00:00)
        today = datetime.datetime.now()
        period_start = today - datetime.timedelta(days=today.weekday())
        period_start = period_start.replace(hour=0, minute=0, second=0, microsecond=0)
        period_name = "week"
    elif FREE_USER_TRANSLATION_PERIOD == 'monthly':
        # Get the start of the current month (1st 00:00:00)
        today = datetime.datetime.now()
        period_start = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        period_name = "month"
    else:
        # Default to weekly if the period is not recognized
        today = datetime.datetime.now()
        period_start = today - datetime.timedelta(days=today.weekday())
        period_start = period_start.replace(hour=0, minute=0, second=0, microsecond=0)
        period_name = "week"
        
    return period_start, period_name

def get_membership_status(user):
    """
    Get the current user's membership status.
    
    Args:
        user: The User object to check
        
    Returns:
        A dictionary with membership status details
    """
    if user.is_membership_active():
        # Calculate next character reset date (30 days from last reset)
        next_character_reset = None
        if user.last_character_reset:
            next_character_reset = user.last_character_reset + datetime.timedelta(days=30)
            
        return {
            'user_type': 'paid',
            'is_active': True,
            'membership_start': user.membership_start.isoformat() if user.membership_start else None,
            'membership_end': user.membership_end.isoformat() if user.membership_end else None,
            'days_remaining': user.get_membership_days_remaining(),
            'translations_limit': 'unlimited',
            'character_limit': user.get_character_limit(),
            'characters_used': user.monthly_characters_used,
            'characters_remaining': user.get_remaining_characters(),
            'next_character_reset': next_character_reset.isoformat() if next_character_reset else None
        }
    elif user.invitation_code and user.invitation_code.is_valid():
        # Calculate next character reset date (30 days from last reset)
        next_character_reset = None
        if user.last_character_reset:
            next_character_reset = user.last_character_reset + datetime.timedelta(days=30)
            
        return {
            'user_type': 'invitation',
            'is_active': True,
            'invitation_code': user.invitation_code.code,
            'translations_limit': 'unlimited',
            'character_limit': user.get_character_limit(),
            'characters_used': user.monthly_characters_used,
            'characters_remaining': user.get_remaining_characters(),
            'next_character_reset': next_character_reset.isoformat() if next_character_reset else None
        }
    else:
        # Free user
        period_start, period_name = get_period_start()
        period_count = TranslationRecord.query.filter(
            TranslationRecord.user_id == user.id,
            TranslationRecord.created_at >= period_start
        ).count()
        
        return {
            'user_type': 'free',
            'is_active': True,
            'translations_limit': FREE_USER_TRANSLATION_LIMIT,
            'translations_used': period_count,
            'translations_remaining': FREE_USER_TRANSLATION_LIMIT - period_count,
            'period': period_name,
            'character_limit': user.get_character_limit(),
            'characters_used': user.monthly_characters_used,
            'characters_remaining': user.get_remaining_characters()
        }

def get_guest_status(ip_address):
    """
    Get the guest translation status for an IP address.
    
    Args:
        ip_address: The client's IP address
        
    Returns:
        A dictionary with guest status details
    """
    remaining = guest_tracker.get_remaining_translations(ip_address)
    
    return {
        'user_type': 'guest',
        'translations_limit': GUEST_TRANSLATION_LIMIT,
        'translations_used': GUEST_TRANSLATION_LIMIT - remaining,
        'translations_remaining': remaining,
        'period': 'lifetime',
        'reset_info': 'Guest translations are limited to one per guest, ever',
        'character_limit': 25000,  # Hard-coded character limit for guests
        'characters_used': 0,      # Not tracking per-guest character usage
        'characters_remaining': 25000
    }

def check_guest_permission(ip_address, filename, src_lang, dest_lang):
    """
    Check if a guest user can translate and record the translation if allowed.
    
    Args:
        ip_address: The client's IP address
        filename: The name of the translated file
        src_lang: Source language code
        dest_lang: Destination language code
        
    Returns:
        (allowed, error_response) where allowed is a boolean indicating if the guest can translate,
        and error_response is the Flask response to return if not allowed (or None if allowed).
    """
    if not guest_tracker.can_translate(ip_address):
        return False, jsonify({
            'error': 'Translation limit reached',
            'message': f'Guest users are limited to {GUEST_TRANSLATION_LIMIT} translation only. Please register for more translations.',
        }), 403
    
    # Record the translation
    guest_tracker.record_translation(ip_address, filename, src_lang, dest_lang)
    remaining = guest_tracker.get_remaining_translations(ip_address)
    print(f"Guest translation from IP {ip_address}: {GUEST_TRANSLATION_LIMIT - remaining + 1}/{GUEST_TRANSLATION_LIMIT}")
    
    return True, None

def process_membership_purchase(user_id, plan_type):
    """
    Process a membership purchase and update the user's membership status.
    
    Args:
        user_id: The ID or username of the user purchasing the membership
        plan_type: The type of membership plan ('monthly', 'annual', 'lifetime')
        
    Returns:
        A tuple containing (success, message, user)
    """
    # Look up the user by ID or username
    if isinstance(user_id, int) or user_id.isdigit():
        user = User.query.get(int(user_id))
    else:
        user = User.query.filter_by(username=user_id).first()
    
    if not user:
        return False, f"User with ID/username '{user_id}' not found", None
    
    # Update the user's membership status
    success = user.activate_paid_membership(plan_type=plan_type)
    
    if success:
        # Save the changes to the database
        db.session.commit()
        return True, f"Membership activated for {user.username} ({plan_type} plan)", user
    else:
        return False, f"Failed to activate membership for {user.username}", user 