"""
User management module for handling user permissions, translation limits, and memberships.
"""

import datetime
from flask import jsonify
from db.models import User, TranslationRecord, db, Referral
from config import FREE_USER_TRANSLATION_LIMIT, FREE_USER_TRANSLATION_PERIOD, GUEST_TRANSLATION_LIMIT, GUEST_USER_CHARACTER_MONTHLY_LIMIT, MAX_REFERRALS_PER_USER, REFERRAL_REWARD_DAYS
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
        'character_limit': GUEST_USER_CHARACTER_MONTHLY_LIMIT,  # Use config value instead of hard-coded 25000
        'characters_used': 0,      # Not tracking per-guest character usage
        'characters_remaining': GUEST_USER_CHARACTER_MONTHLY_LIMIT
    }

def check_guest_permission(ip_address, filename, src_lang, dest_lang, character_count=0):
    """
    Check if a guest user can translate and record the translation if allowed.
    
    Args:
        ip_address: The client's IP address
        filename: The name of the translated file
        src_lang: Source language code
        dest_lang: Destination language code
        character_count: The estimated character count for the translation
        
    Returns:
        (allowed, error_response) where allowed is a boolean indicating if the guest can translate,
        and error_response is the Flask response to return if not allowed (or None if allowed).
    """
    # First check number of translations limit
    if not guest_tracker.can_translate(ip_address):
        return False, jsonify({
            'error': 'Translation limit reached',
            'message': f'Guest users are limited to {GUEST_TRANSLATION_LIMIT} translation only. Please register for more translations.',
        }), 403
    
    # Then check character limit if we have an estimate
    if character_count > 0 and character_count > GUEST_USER_CHARACTER_MONTHLY_LIMIT:
        return False, jsonify({
            'error': 'Character limit exceeded',
            'message': f'This file exceeds the {GUEST_USER_CHARACTER_MONTHLY_LIMIT} character limit for guest users. Please register for a higher limit.',
            'i18n_key': 'pricing.character_limit_title'
        }), 403
    
    # Record the translation
    guest_tracker.record_translation(ip_address, filename, src_lang, dest_lang, character_count)
    remaining = guest_tracker.get_remaining_translations(ip_address)
    print(f"Guest translation from IP {ip_address}: {GUEST_TRANSLATION_LIMIT - remaining + 1}/{GUEST_TRANSLATION_LIMIT}")
    
    return True, None

def process_membership_purchase(user_id, plan_type):
    """
    Process a membership purchase and update the user's membership status.
    
    Args:
        user_id: The ID or username of the user purchasing the membership
        plan_type: The type of membership plan ('monthly', 'yearly')
        
    Returns:
        The updated membership status dictionary
    """
    # Look up the user by ID or username
    if isinstance(user_id, int) or user_id.isdigit():
        user = User.query.get(int(user_id))
    else:
        user = User.query.filter_by(username=user_id).first()
    
    if not user:
        # Return error status if user not found
        return {
            'user_type': 'free',
            'is_active': False,
            'error': 'User not found'
        }
    
    # Map plan_type to the correct parameters for activate_paid_membership
    if plan_type == 'yearly':
        success = user.activate_paid_membership(is_yearly=True)
    elif plan_type == 'monthly':
        success = user.activate_paid_membership(is_yearly=False)
    else:
        # Invalid plan type, return current status
        return get_membership_status(user)
    
    if success:
        # Save the changes to the database
        db.session.commit()
        # Return the updated membership status
        return get_membership_status(user)
    else:
        # Return current status if activation failed
        return get_membership_status(user)

class UserService:
    """Service class for user-related operations."""
    
    @staticmethod
    def get_membership_status(user):
        """
        Get comprehensive membership status for a user.
        
        Returns:
        {
            "is_active": bool,
            "membership_end": datetime,
            "days_remaining": int,
            "sources": ["payment", "invitation_code", "referral"],
            "bonus_days": int,
            "can_generate_referrals": bool
        }
        """
        if not user:
            return {
                "is_active": False,
                "membership_end": None,
                "days_remaining": 0,
                "sources": ["free"],
                "bonus_days": 0,
                "can_generate_referrals": False
            }
        
        is_active = user.is_membership_active()
        days_remaining = user.get_membership_days_remaining()
        sources = user.get_membership_source_summary()
        bonus_days = user.bonus_membership_days or 0
        can_generate_referrals = user.can_generate_referral_codes()
        
        return {
            "is_active": is_active,
            "membership_end": user.membership_end.isoformat() if user.membership_end else None,
            "days_remaining": days_remaining,
            "sources": sources,
            "bonus_days": bonus_days,
            "can_generate_referrals": can_generate_referrals
        }
    
    @staticmethod
    def can_show_referral_popup(user):
        """
        Check if the referral popup should be shown to the user.
        Only show to users with active membership.
        """
        if not user:
            return False
        
        # Only show popup to users with active membership
        return user.is_membership_active()
    
    @staticmethod
    def get_referral_stats(user):
        """
        Get referral statistics for a user.
        
        Returns:
        {
            "total_referrals": int,
            "completed_referrals": int,
            "pending_referrals": int,
            "total_bonus_days_earned": int,
            "can_create_more": bool,
            "remaining_slots": int
        }
        """
        if not user:
            return {
                "total_referrals": 0,
                "completed_referrals": 0,
                "pending_referrals": 0,
                "total_bonus_days_earned": 0,
                "can_create_more": False,
                "remaining_slots": 0
            }
        
        # Get all referrals created by this user
        total_referrals = Referral.query.filter_by(referrer_user_id=user.id).count()
        completed_referrals = Referral.query.filter_by(
            referrer_user_id=user.id, 
            status='completed'
        ).count()
        pending_referrals = Referral.query.filter_by(
            referrer_user_id=user.id, 
            status='pending'
        ).count()
        
        # Calculate bonus days earned from referrals
        total_bonus_days_earned = completed_referrals * REFERRAL_REWARD_DAYS
        
        # Check if user can create more referrals
        remaining_slots = max(0, MAX_REFERRALS_PER_USER - total_referrals)
        can_create_more = (
            user.can_generate_referral_codes() and 
            remaining_slots > 0
        )
        
        return {
            "total_referrals": total_referrals,
            "completed_referrals": completed_referrals,
            "pending_referrals": pending_referrals,
            "total_bonus_days_earned": total_bonus_days_earned,
            "can_create_more": can_create_more,
            "remaining_slots": remaining_slots
        }
    
    @staticmethod
    def update_character_usage_with_bonus(user, character_count):
        """
        Update character usage considering bonus membership days.
        This extends the existing character tracking to account for bonus days.
        """
        if not user:
            return False
        
        # Use existing method but ensure membership status includes bonus days
        user.update_character_usage(character_count)
        return True
    
    @staticmethod
    def get_user_permissions(user):
        """
        Get comprehensive user permissions including referral-related permissions.
        
        Returns:
        {
            "can_translate": bool,
            "can_generate_referrals": bool,
            "can_submit_feedback": bool,
            "is_admin": bool,
            "character_limit": int,
            "remaining_characters": int
        }
        """
        if not user:
            return {
                "can_translate": False,
                "can_generate_referrals": False,
                "can_submit_feedback": True,  # Anyone can submit feedback
                "is_admin": False,
                "character_limit": 0,
                "remaining_characters": 0
            }
        
        # Check basic permissions
        can_translate = user.is_membership_active() or user.has_character_quota_available(1)
        can_generate_referrals = user.can_generate_referral_codes()
        is_admin = user.is_administrator()
        
        # Character limits
        character_limit = user.get_character_limit()
        remaining_characters = user.get_remaining_characters()
        
        return {
            "can_translate": can_translate,
            "can_generate_referrals": can_generate_referrals,
            "can_submit_feedback": True,
            "is_admin": is_admin,
            "character_limit": character_limit,
            "remaining_characters": remaining_characters
        }
    
    @staticmethod
    def calculate_membership_extension(user, bonus_days):
        """
        Calculate what the new membership end date would be if bonus days were added.
        This is useful for preview purposes before actually adding the days.
        """
        if not user:
            return None
        
        now = datetime.datetime.utcnow()
        
        if user.is_paid_user and user.membership_end and user.membership_end > now:
            # User has active membership, extend it
            new_end = user.membership_end + datetime.timedelta(days=bonus_days)
        else:
            # User doesn't have active membership, start from now
            new_end = now + datetime.timedelta(days=bonus_days)
        
        return new_end
    
    @staticmethod
    def get_user_dashboard_data(user):
        """
        Get comprehensive dashboard data for a user including membership and referral info.
        """
        if not user:
            return None
        
        membership_status = UserService.get_membership_status(user)
        referral_stats = UserService.get_referral_stats(user)
        permissions = UserService.get_user_permissions(user)
        
        return {
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "created_at": user.created_at.isoformat(),
                "last_login": user.last_login.isoformat() if user.last_login else None,
                "is_email_verified": user.is_email_verified
            },
            "membership": membership_status,
            "referrals": referral_stats,
            "permissions": permissions
        } 