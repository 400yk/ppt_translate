"""
User management module for handling user permissions, translation limits, and memberships.
"""

import datetime
from flask import jsonify
from models import User, TranslationRecord, db
from config import FREE_USER_TRANSLATION_LIMIT, FREE_USER_TRANSLATION_PERIOD, GUEST_TRANSLATION_LIMIT
from guest_tracker import guest_tracker

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
        # Paid members have unlimited translations
        return True, None
        
    # Check if user has a valid invitation code
    elif user.invitation_code:
        # Users with invitation codes use their code's quota
        if user.invitation_code.is_valid():
            user.invitation_code.increment_usage()
            print(f"Updated usage count for invitation code: {user.invitation_code.code}")
            print(f"Current usage: {user.invitation_code.uses}/{user.invitation_code.max_uses}")
            
            # If this is their first use of the invitation code, activate their membership
            if user.is_paid_user is False and user.membership_start is None:
                user.activate_paid_membership(is_invitation=True)
                print(f"Activated invitation-based membership for {user.username} until {user.membership_end}")
            
            return True, None
        else:
            return False, jsonify({'error': 'Your invitation code has reached its usage limit or has been deactivated'}), 403
        
    # Check free user translation limits
    else:
        # Free registered users have limited translations based on the period
        print(f"Free user, checking {FREE_USER_TRANSLATION_PERIOD} limit of {FREE_USER_TRANSLATION_LIMIT}")
        
        period_start, period_name = get_period_start()
        
        # Count translations in the current period
        period_count = TranslationRecord.query.filter(
            TranslationRecord.user_id == user.id,
            TranslationRecord.created_at >= period_start
        ).count()
        
        if period_count >= FREE_USER_TRANSLATION_LIMIT:
            # User has already used their quota
            return False, jsonify({
                'error': f'{period_name.capitalize()} translation limit reached',
                'message': f'Free users can only perform {FREE_USER_TRANSLATION_LIMIT} translation(s) per {period_name}. Consider upgrading to a paid membership for unlimited translations.'
            }), 403
        
        print(f"User has used {period_count}/{FREE_USER_TRANSLATION_LIMIT} translations this {period_name}")
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
        return {
            'user_type': 'paid',
            'is_active': True,
            'membership_start': user.membership_start.isoformat() if user.membership_start else None,
            'membership_end': user.membership_end.isoformat() if user.membership_end else None,
            'days_remaining': user.get_membership_days_remaining(),
            'translations_limit': 'unlimited'
        }
    elif user.invitation_code and user.invitation_code.is_valid():
        return {
            'user_type': 'invitation',
            'is_active': True,
            'invitation_code': user.invitation_code.code,
            'uses': user.invitation_code.uses,
            'max_uses': user.invitation_code.max_uses,
            'remaining_uses': user.invitation_code.remaining_uses(),
            'translations_limit': user.invitation_code.max_uses
        }
    else:
        # Free user
        # Calculate remaining translations in the current period
        period_start, period_name = get_period_start()
        period_count = TranslationRecord.query.filter(
            TranslationRecord.user_id == user.id,
            TranslationRecord.created_at >= period_start
        ).count()
        
        remaining = max(0, FREE_USER_TRANSLATION_LIMIT - period_count)
        
        # Calculate period end
        if FREE_USER_TRANSLATION_PERIOD == 'daily':
            period_end = (period_start + datetime.timedelta(days=1)).isoformat()
        elif FREE_USER_TRANSLATION_PERIOD == 'weekly':
            period_end = (period_start + datetime.timedelta(days=7)).isoformat()
        elif FREE_USER_TRANSLATION_PERIOD == 'monthly':
            today = datetime.datetime.now()
            next_month = today.month + 1 if today.month < 12 else 1
            next_month_year = today.year if today.month < 12 else today.year + 1
            period_end = datetime.datetime(next_month_year, next_month, 1).isoformat()
        
        return {
            'user_type': 'free',
            'is_active': True,
            'translations_limit': FREE_USER_TRANSLATION_LIMIT,
            'translations_used': period_count,
            'translations_remaining': remaining,
            'period': FREE_USER_TRANSLATION_PERIOD,
            'period_end': period_end,
            'reset_info': f"Translations reset at the start of each {period_name}"
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
        'reset_info': 'Guest translations are limited to one per guest, ever'
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
        plan_type: 'monthly' or 'yearly'
        
    Returns:
        A dictionary with updated membership status
    """
    # Check if user_id is a username or an actual ID
    user = None
    if isinstance(user_id, str):
        # It's a username
        user = User.query.filter_by(username=user_id).first()
    else:
        # It's a user ID
        user = User.query.get(user_id)
        
    if not user:
        print(f"User not found: {user_id}")
        return {'error': 'User not found'}, 404
    
    print(f"Processing membership purchase for user: {user.username}, plan: {plan_type}")
    
    now = datetime.datetime.now()
    
    # If user is currently a free user, start membership from now
    if not user.is_membership_active():
        user.membership_start = now
        user.is_paid_user = True
        
        if plan_type == 'monthly':
            user.membership_end = now + datetime.timedelta(days=30)
        else:  # yearly
            user.membership_end = now + datetime.timedelta(days=365)
    
    # If user already has an active membership, extend it
    else:
        if plan_type == 'monthly':
            user.membership_end = user.membership_end + datetime.timedelta(days=30)
        else:  # yearly
            user.membership_end = user.membership_end + datetime.timedelta(days=365)
    
    db.session.commit()
    print(f"Membership updated. End date: {user.membership_end}")
    
    # Return updated membership status
    return {
        'user_type': 'paid',
        'is_active': True,
        'membership_start': user.membership_start.isoformat(),
        'membership_end': user.membership_end.isoformat(),
        'days_remaining': user.get_membership_days_remaining(),
        'plan_type': plan_type
    } 