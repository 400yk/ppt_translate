from flask_sqlalchemy import SQLAlchemy
import datetime
import secrets
import string
from config import (
    INVITATION_MEMBERSHIP_MONTHS, 
    PAID_MEMBERSHIP_MONTHLY, 
    PAID_MEMBERSHIP_YEARLY,
    FREE_USER_CHARACTER_MONTHLY_LIMIT,
    PAID_USER_CHARACTER_MONTHLY_LIMIT,
    REFERRAL_CODE_LENGTH,
    REFERRAL_EXPIRY_DAYS,
    EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS
)
from dateutil.relativedelta import relativedelta

db = SQLAlchemy()

class InvitationCode(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(12), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    active = db.Column(db.Boolean, default=True)
    last_used = db.Column(db.DateTime)
    
    @classmethod
    def generate_code(cls, length=8):
        """Generate a random alphanumeric code."""
        alphabet = string.ascii_uppercase + string.digits
        while True:
            code = ''.join(secrets.choice(alphabet) for _ in range(length))
            # Check that code doesn't already exist
            if not cls.query.filter_by(code=code).first():
                return code
    
    @classmethod
    def generate_batch(cls, count=50):
        """Generate multiple invitation codes at once."""
        codes = []
        for _ in range(count):
            code = cls.generate_code()
            codes.append(code)
        return codes
    
    def mark_as_used(self):
        """Mark this code as used by recording the timestamp."""
        self.last_used = datetime.datetime.utcnow()
        db.session.commit()
        return True
    
    def is_valid(self):
        """Check if the invitation code is still valid."""
        # A code is valid if it's active and not yet used by any user
        return self.active and not self.users.first()
    
    def deactivate(self):
        """Deactivate this invitation code."""
        self.active = False
        db.session.commit()
        return True
    
    def reactivate(self):
        """Reactivate this invitation code."""
        self.active = True
        db.session.commit()
        return True

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=True) # Ensure this is True
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    last_login = db.Column(db.DateTime)
    invitation_code_id = db.Column(db.Integer, db.ForeignKey('invitation_code.id'))
    invitation_code = db.relationship('InvitationCode', backref=db.backref('users', lazy='dynamic'))
    translations = db.relationship('TranslationRecord', backref='user', lazy='dynamic')
    # Membership tracking fields
    membership_start = db.Column(db.DateTime)
    membership_end = db.Column(db.DateTime)
    is_paid_user = db.Column(db.Boolean, default=False)
    # Stripe integration
    stripe_customer_id = db.Column(db.String(255), nullable=True)
    # Character usage tracking
    monthly_characters_used = db.Column(db.Integer, default=0)
    last_character_reset = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    # Google OAuth fields
    google_id = db.Column(db.String(255), nullable=True, unique=True)
    # google_access_token = db.Column(db.String(1024), nullable=True) # don't need this, maybe use refresh token instead in the future
    # Email verification fields
    is_email_verified = db.Column(db.Boolean, default=False, nullable=False)
    email_verification_token = db.Column(db.String(100), nullable=True, unique=True, index=True)
    email_verification_sent_at = db.Column(db.DateTime, nullable=True)
    email_verification_token_expires_at = db.Column(db.DateTime, nullable=True)
    # Referral system fields
    referral_code = db.Column(db.String(20), unique=True, nullable=True, index=True)  # User's personal referral code
    referred_by_code = db.Column(db.String(20), nullable=True, index=True)  # Code that referred this user
    bonus_membership_days = db.Column(db.Integer, default=0)  # Extra days earned from referrals
    # Admin role field
    is_admin = db.Column(db.Boolean, default=False, nullable=False)
    
    def set_password(self, password):
        """Hash the password and store it."""
        from werkzeug.security import generate_password_hash
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Verify password against stored hash."""
        from werkzeug.security import check_password_hash
        return check_password_hash(self.password_hash, password)
    
    def get_translation_count(self):
        """Get the number of translations performed by this user."""
        return self.translations.count()
    
    def record_translation(self, filename, src_lang, dest_lang, character_count=0, status='success', error_message=None, processing_time=None):
        """Record a translation performed by this user."""
        translation = TranslationRecord(
            user_id=self.id,
            filename=filename,
            source_language=src_lang,
            target_language=dest_lang,
            character_count=character_count,
            status=status,
            error_message=error_message,
            processing_time=processing_time,
            started_at=datetime.datetime.utcnow() - datetime.timedelta(seconds=processing_time or 0),
            completed_at=datetime.datetime.utcnow()
        )
        db.session.add(translation)
        
        # Update character usage only for successful translations
        if status == 'success':
            self.update_character_usage(character_count)
        
        db.session.commit()
        return translation
    
    def update_character_usage(self, character_count):
        """Update the character usage count and check if reset is needed."""
        # Check if we need to reset the counter
        now = datetime.datetime.utcnow()
        if self.last_character_reset:
            if self.is_membership_active():
                # For paid users: Reset if it's been at least 30 days since last reset
                days_since_last_reset = (now - self.last_character_reset).days
                if days_since_last_reset >= 30:
                    self.monthly_characters_used = 0
                    self.last_character_reset = now
            else:
                # For free users: Reset if it's a new calendar month
                last_reset_month = self.last_character_reset.month
                last_reset_year = self.last_character_reset.year
                current_month = now.month
                current_year = now.year
                
                if current_month != last_reset_month or current_year != last_reset_year:
                    self.monthly_characters_used = 0
                    self.last_character_reset = now
        else:
            self.last_character_reset = now
            
        # Add the new character count
        self.monthly_characters_used += character_count
        return self.monthly_characters_used
    
    def get_character_limit(self):
        """Get the character limit based on user's membership."""
        if self.is_membership_active():
            return PAID_USER_CHARACTER_MONTHLY_LIMIT
        return FREE_USER_CHARACTER_MONTHLY_LIMIT
    
    def get_remaining_characters(self):
        """Get the number of characters remaining for the current month."""
        limit = self.get_character_limit()
        used = self.monthly_characters_used or 0
        return max(0, limit - used)
    
    def has_character_quota_available(self, needed_characters):
        """Check if the user has enough character quota for a translation."""
        return self.get_remaining_characters() >= needed_characters
    
    def activate_paid_membership(self, months=None, is_invitation=False, is_yearly=False):
        """
        Activate paid membership for the specified number of months.
        If months is None, use the default from config based on membership type.
        
        Args:
            months: Number of months for membership duration
            is_invitation: Whether this is an invitation-based membership (NOT a paid membership)
            is_yearly: Whether this is a yearly subscription (vs monthly)
        
        Note: is_paid_user is only set to True for actual payments (Alipay/Stripe),
        not for invitation codes or referral bonuses.
        """
        if months is None:
            if is_invitation:
                months = INVITATION_MEMBERSHIP_MONTHS
            else:
                months = PAID_MEMBERSHIP_YEARLY if is_yearly else PAID_MEMBERSHIP_MONTHLY
            
        now = datetime.datetime.utcnow()
        
        # Handle fractional months by converting to days
        # relativedelta doesn't support fractional months, so we use timedelta for those
        if not is_yearly and months is not None and months != int(months):
            # Convert fractional months to days (assuming 30 days per month)
            days = int(months * 30)
            duration = datetime.timedelta(days=days)
        else:
            duration = None
        
        # Check if user has active membership (regardless of is_paid_user)
        if self.membership_end and self.membership_end > now:
            # Extend existing membership
            if is_yearly:
                self.membership_end = self.membership_end + relativedelta(years=1)
            elif duration is not None:
                self.membership_end = self.membership_end + duration
            else:
                self.membership_end = self.membership_end + relativedelta(months=int(months))
            
            # If this is a real payment (not invitation), set is_paid_user=True
            if not is_invitation:
                self.is_paid_user = True
        else:
            # New membership or expired membership
            self.membership_start = now
            if is_yearly:
                self.membership_end = now + relativedelta(years=1)
            elif duration is not None:
                self.membership_end = now + duration
            else:
                self.membership_end = now + relativedelta(months=int(months))
            
            # Only set is_paid_user=True for actual payments, not invitations
            if not is_invitation:
                self.is_paid_user = True
            
        db.session.commit()
        return True
        
    def cancel_membership(self):
        """
        Cancel the user's paid membership (e.g., when they cancel their subscription).
        
        Note: This sets is_paid_user=False, which is different from membership expiration.
        Expired memberships should keep is_paid_user=True as a historical record that
        the user was once a paying customer.
        """
        self.is_paid_user = False
        # Optionally set membership_end to now to immediately expire membership
        # self.membership_end = datetime.datetime.utcnow()
        db.session.commit()
        return True
        
    def is_membership_active(self):
        """
        Check if the user has an active membership (regardless of source).
        Membership can come from:
        - Paid membership (Alipay/Stripe) - is_paid_user=True
        - Invitation codes - is_paid_user=False
        - Referral bonuses - is_paid_user=False
        
        Note: is_paid_user is a historical flag indicating if user ever paid with money.
        It does NOT determine if membership is currently active.
        """
        now = datetime.datetime.utcnow()
        
        # Simply check if membership_end is in the future
        # Do NOT modify is_paid_user here - it's a historical flag
        if self.membership_end and self.membership_end > now:
            return True
        
        return False
        
    def get_membership_days_remaining(self):
        """Get the number of days remaining in the membership."""
        if not self.membership_end:
            return 0
            
        now = datetime.datetime.utcnow()
        if self.membership_end <= now:
            return 0
            
        delta = self.membership_end - now
        return delta.days
    
    def add_bonus_membership_days(self, days):
        """
        Add bonus membership days to the user's account (e.g., from referrals).
        Note: This does NOT set is_paid_user=True, as bonus days are not from actual payment.
        """
        now = datetime.datetime.utcnow()
        
        # Track bonus days
        self.bonus_membership_days = (self.bonus_membership_days or 0) + days
        
        # If user has an active membership, extend it
        if self.membership_end and self.membership_end > now:
            self.membership_end = self.membership_end + datetime.timedelta(days=days)
        else:
            # Give user new membership starting now
            self.membership_start = now
            self.membership_end = now + datetime.timedelta(days=days)
            # Do NOT set is_paid_user=True for bonus days
        
        db.session.commit()
        return True
    
    def get_or_create_referral_code(self):
        """Get the user's personal referral code, creating one if it doesn't exist."""
        if not self.referral_code:
            self.referral_code = self._generate_unique_referral_code()
            db.session.commit()
        return self.referral_code
    
    def _generate_unique_referral_code(self):
        """Generate a unique referral code for this user."""
        from config import REFERRAL_CODE_LENGTH
        
        # Use a mix of uppercase letters and digits, avoiding confusing characters
        alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
        
        while True:
            code = ''.join(secrets.choice(alphabet) for _ in range(REFERRAL_CODE_LENGTH))
            # Check that code doesn't already exist in users table
            if not User.query.filter_by(referral_code=code).first():
                # Also check referrals table to avoid conflicts (will be checked later when Referral class is defined)
                return code
    
    def get_membership_source_summary(self):
        """Get a summary of how the user obtained their membership."""
        sources = []
        
        # Check if user has paid membership
        if self.stripe_customer_id:
            sources.append("payment")
        
        # Check if user used invitation code
        if self.invitation_code_id:
            sources.append("invitation_code")
        
        # Check if user was referred
        if self.referred_by_code:
            sources.append("referral")
        
        # Check if user has bonus days
        if self.bonus_membership_days and self.bonus_membership_days > 0:
            sources.append(f"bonus_{self.bonus_membership_days}_days")
            
        return sources if sources else ["free"]
    
    def can_generate_referral_codes(self):
        """Check if user is eligible to generate referral codes."""
        from config import REFERRAL_FEATURE_PAID_MEMBERS_ONLY
        
        if not REFERRAL_FEATURE_PAID_MEMBERS_ONLY:
            return True
            
        return self.is_membership_active()
    
    def set_referred_by(self, referral_code):
        """Set the referral code that referred this user."""
        self.referred_by_code = referral_code
        db.session.commit()
        return True

    def generate_email_verification_token(self):
        """Generate a new email verification token."""
        import secrets
        
        self.email_verification_token = secrets.token_urlsafe(32)
        self.email_verification_sent_at = datetime.datetime.utcnow()
        self.email_verification_token_expires_at = (
            datetime.datetime.utcnow() + 
            datetime.timedelta(hours=EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS)
        )
        db.session.commit()
        return self.email_verification_token
    
    def verify_email_token(self, token):
        """Verify the email verification token."""
        if not self.email_verification_token:
            return False
        
        if token != self.email_verification_token:
            return False
        
        # Check if token has expired
        if datetime.datetime.utcnow() > self.email_verification_token_expires_at:
            return False
        
        # Mark email as verified
        self.is_email_verified = True
        self.email_verification_token = None
        self.email_verification_sent_at = None
        self.email_verification_token_expires_at = None
        db.session.commit()
        return True
    
    def is_email_verification_token_expired(self):
        """Check if the email verification token has expired."""
        if not self.email_verification_token_expires_at:
            return True
        return datetime.datetime.utcnow() > self.email_verification_token_expires_at
    
    def can_resend_verification_email(self, cooldown_minutes=2):
        """Check if user can request a new verification email (cooldown protection)."""
        if not self.email_verification_sent_at:
            return True
        
        cooldown_period = datetime.timedelta(minutes=cooldown_minutes)
        return datetime.datetime.utcnow() > (self.email_verification_sent_at + cooldown_period)
    
    def is_administrator(self):
        """Check if the user is an administrator."""
        return self.is_admin or self.id == 1  # Backward compatibility with existing admin check

class TranslationRecord(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    filename = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    source_language = db.Column(db.String(10))
    target_language = db.Column(db.String(10))
    character_count = db.Column(db.Integer, default=0)
    # Translation status tracking
    status = db.Column(db.Enum('processing', 'success', 'failed', name='translation_status'), 
                      default='processing', nullable=False)
    error_message = db.Column(db.Text, nullable=True)
    processing_time = db.Column(db.Float, nullable=True)  # in seconds
    started_at = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    
    @classmethod
    def get_recent(cls, limit=10):
        """Get the most recent translations."""
        return cls.query.order_by(cls.created_at.desc()).limit(limit).all() 

class GuestTranslation(db.Model):
    """
    Stores translation records for guest users identified by IP address.
    Replaces the file-based guest_translations.json storage for Heroku compatibility.
    """
    id = db.Column(db.Integer, primary_key=True)
    ip_address = db.Column(db.String(45), index=True, nullable=False)  # IPv6 can be up to 45 chars
    filename = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    source_language = db.Column(db.String(10))
    target_language = db.Column(db.String(10))
    character_count = db.Column(db.Integer, default=0)
    
    @classmethod
    def count_by_ip(cls, ip_address):
        """Count the number of translations made by a specific IP address."""
        return cls.query.filter_by(ip_address=ip_address).count()

class Referral(db.Model):
    """
    Stores referral relationships and tracking information.
    Tracks when users refer friends and manages reward allocation.
    """
    id = db.Column(db.Integer, primary_key=True)
    referrer_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    referee_email = db.Column(db.String(120), nullable=True)  # Nullable for Option B - populated during registration
    referee_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    referral_code = db.Column(db.String(20), unique=True, nullable=False, index=True)
    status = db.Column(db.Enum('pending', 'completed', 'expired', name='referral_status'), 
                      default='pending', nullable=False)
    reward_claimed = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, nullable=False)
    completed_at = db.Column(db.DateTime, nullable=True)
    expires_at = db.Column(db.DateTime, nullable=False)
    
    # Relationships
    referrer = db.relationship('User', foreign_keys=[referrer_user_id], 
                              backref=db.backref('sent_referrals', lazy='dynamic'))
    referee = db.relationship('User', foreign_keys=[referee_user_id], 
                             backref=db.backref('received_referrals', lazy='dynamic'))
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.referral_code:
            self.referral_code = self.generate_referral_code()
        if not self.expires_at:
            self.expires_at = datetime.datetime.utcnow() + datetime.timedelta(days=REFERRAL_EXPIRY_DAYS)
    
    @classmethod
    def generate_referral_code(cls, length=None):
        """Generate a unique referral code."""
        if length is None:
            length = REFERRAL_CODE_LENGTH
        
        # Use a mix of uppercase letters and digits, avoiding confusing characters
        alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
        
        while True:
            code = ''.join(secrets.choice(alphabet) for _ in range(length))
            # Check that code doesn't already exist
            if not cls.query.filter_by(referral_code=code).first():
                return code
    
    def is_expired(self):
        """Check if this referral has expired."""
        return datetime.datetime.utcnow() > self.expires_at
    
    def is_valid(self):
        """Check if this referral is still valid for use."""
        return (self.status == 'pending' and 
                not self.is_expired() and 
                not self.referee_user_id)
    
    def complete_referral(self, referee_user):
        """Mark this referral as completed when the referee registers."""
        if self.status != 'pending':
            return False
        
        if self.is_expired():
            self.status = 'expired'
            db.session.commit()
            return False
        
        # Set referee information (first come, first served for Option B)
        self.referee_user_id = referee_user.id
        self.referee_email = referee_user.email
        self.status = 'completed'
        self.completed_at = datetime.datetime.utcnow()
        db.session.commit()
        return True
    
    def claim_reward(self):
        """Claim the referral reward for both users."""
        if self.status != 'completed' or self.reward_claimed:
            return False
        
        from config import REFERRAL_REWARD_DAYS
        
        # Award bonus days to both referrer and referee
        if self.referrer:
            self.referrer.add_bonus_membership_days(REFERRAL_REWARD_DAYS)
        
        if self.referee:
            self.referee.add_bonus_membership_days(REFERRAL_REWARD_DAYS)
        
        self.reward_claimed = True
        db.session.commit()
        return True
    
    @classmethod
    def get_by_code(cls, referral_code):
        """Get a referral by its code."""
        return cls.query.filter_by(referral_code=referral_code).first()
    
    @classmethod
    def get_user_referrals(cls, user_id, status=None):
        """Get all referrals created by a user, optionally filtered by status."""
        query = cls.query.filter_by(referrer_user_id=user_id)
        if status:
            query = query.filter_by(status=status)
        return query.order_by(cls.created_at.desc()).all()

class PaymentTransaction(db.Model):
    """
    Stores payment transaction records for tracking all payment attempts.
    Provides complete audit trail and payment history.
    """
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    order_number = db.Column(db.String(255), unique=True, nullable=False, index=True)
    payment_method = db.Column(db.String(50), nullable=False)  # 'stripe', 'alipay'
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    currency = db.Column(db.String(10), nullable=False, default='usd')
    plan_type = db.Column(db.String(20), nullable=False)  # 'monthly', 'yearly'
    status = db.Column(db.Enum('pending', 'success', 'failed', 'cancelled', name='payment_status'), 
                      default='pending', nullable=False)
    transaction_id = db.Column(db.String(255), nullable=True)  # External transaction ID
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    processed_at = db.Column(db.DateTime, nullable=True)
    error_message = db.Column(db.Text, nullable=True)
    payment_metadata = db.Column(db.JSON, nullable=True)  # Store additional payment-specific data
    
    # Relationship
    user = db.relationship('User', backref=db.backref('payment_transactions', lazy='dynamic'))
    
    def __repr__(self):
        return f'<PaymentTransaction {self.order_number}: {self.status}>'
    
    @classmethod
    def create_pending_transaction(cls, user_id, order_number, payment_method, amount, 
                                 currency, plan_type, metadata=None):
        """Create a new pending payment transaction."""
        transaction = cls(
            user_id=user_id,
            order_number=order_number,
            payment_method=payment_method,
            amount=amount,
            currency=currency,
            plan_type=plan_type,
            status='pending',
            payment_metadata=metadata or {}
        )
        db.session.add(transaction)
        db.session.commit()
        return transaction
    
    def mark_successful(self, transaction_id=None, metadata=None):
        """Mark the transaction as successful."""
        self.status = 'success'
        self.transaction_id = transaction_id
        self.processed_at = datetime.datetime.utcnow()
        if metadata:
            self.payment_metadata = metadata
        db.session.commit()
        return self
    
    def mark_failed(self, error_message=None, metadata=None):
        """Mark the transaction as failed."""
        self.status = 'failed'
        self.error_message = error_message
        if metadata:
            self.payment_metadata = metadata
        db.session.commit()
        return self
    
    def mark_cancelled(self, metadata=None):
        """Mark the transaction as cancelled."""
        self.status = 'cancelled'
        if metadata:
            self.payment_metadata = metadata
        db.session.commit()
        return self
    
    @classmethod
    def get_by_order_number(cls, order_number):
        """Get transaction by order number."""
        return cls.query.filter_by(order_number=order_number).first()
    
    @classmethod
    def get_user_transactions(cls, user_id, status=None, limit=None):
        """Get transactions for a specific user."""
        query = cls.query.filter_by(user_id=user_id)
        if status:
            query = query.filter_by(status=status)
        query = query.order_by(cls.created_at.desc())
        if limit:
            query = query.limit(limit)
        return query.all()
    
    @classmethod
    def get_recent_transactions(cls, limit=50):
        """Get recent transactions for admin dashboard."""
        return cls.query.order_by(cls.created_at.desc()).limit(limit).all()

class Feedback(db.Model):
    """
    Stores user feedback submitted through the application.
    Supports both authenticated and anonymous feedback.
    """
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    feedback_text = db.Column(db.Text, nullable=False)
    rating = db.Column(db.Integer, nullable=True)  # 1-5 star rating
    user_email = db.Column(db.String(120), nullable=True)  # For anonymous feedback
    page_context = db.Column(db.String(100), nullable=True)  # Which page feedback was given from
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, nullable=False)
    
    # Relationship
    user = db.relationship('User', backref=db.backref('feedback_submissions', lazy='dynamic'))
    
    def is_anonymous(self):
        """Check if this feedback was submitted anonymously."""
        return self.user_id is None
    
    def get_submitter_identifier(self):
        """Get an identifier for the feedback submitter."""
        if self.user:
            return f"User: {self.user.username} ({self.user.email})"
        elif self.user_email:
            return f"Anonymous: {self.user_email}"
        else:
            return "Anonymous (no email provided)"
    
    @classmethod
    def get_recent(cls, limit=20):
        """Get the most recent feedback submissions."""
        return cls.query.order_by(cls.created_at.desc()).limit(limit).all()
    
    @classmethod
    def get_by_user(cls, user_id):
        """Get all feedback submitted by a specific user."""
        return cls.query.filter_by(user_id=user_id).order_by(cls.created_at.desc()).all()
    
    @classmethod
    def get_average_rating(cls):
        """Get the average rating from all feedback with ratings."""
        result = db.session.query(db.func.avg(cls.rating)).filter(cls.rating.isnot(None)).scalar()
        return round(result, 2) if result else None 