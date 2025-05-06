from flask_sqlalchemy import SQLAlchemy
import datetime
import secrets
import string
from config import PAID_MEMBERSHIP_MONTHLY, PAID_MEMBERSHIP_YEARLY, INVITATION_MEMBERSHIP_MONTHS, FREE_USER_CHARACTER_MONTHLY_LIMIT, PAID_USER_CHARACTER_MONTHLY_LIMIT

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
            invitation = cls(code=code)
            db.session.add(invitation)
            codes.append(code)
        db.session.commit()
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
    password_hash = db.Column(db.String(256), nullable=False)
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
    
    def record_translation(self, filename, src_lang, dest_lang, character_count=0):
        """Record a translation performed by this user."""
        translation = TranslationRecord(
            user_id=self.id,
            filename=filename,
            source_language=src_lang,
            target_language=dest_lang,
            character_count=character_count
        )
        db.session.add(translation)
        
        # Update character usage
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
            is_invitation: Whether this is an invitation-based membership
            is_yearly: Whether this is a yearly subscription (vs monthly)
        """
        if months is None:
            if is_invitation:
                months = INVITATION_MEMBERSHIP_MONTHS
            else:
                months = PAID_MEMBERSHIP_YEARLY if is_yearly else PAID_MEMBERSHIP_MONTHLY
            
        now = datetime.datetime.utcnow()
        # If already a member, extend from current end date
        if self.is_paid_user and self.membership_end and self.membership_end > now:
            self.membership_end = self.membership_end + datetime.timedelta(days=30*months)
        else:
            # New membership or expired membership
            self.membership_start = now
            self.membership_end = now + datetime.timedelta(days=30*months)
            self.is_paid_user = True
            
        db.session.commit()
        return True
        
    def cancel_membership(self):
        """Cancel the user's paid membership."""
        self.is_paid_user = False
        db.session.commit()
        return True
        
    def is_membership_active(self):
        """Check if the user has an active paid membership."""
        if not self.is_paid_user:
            return False
            
        now = datetime.datetime.utcnow()
        if self.membership_end and self.membership_end > now:
            return True
            
        # Membership has expired
        if self.membership_end and self.membership_end <= now:
            self.is_paid_user = False
            db.session.commit()
            
        return False
        
    def get_membership_days_remaining(self):
        """Get the number of days remaining in the membership."""
        if not self.is_paid_user or not self.membership_end:
            return 0
            
        now = datetime.datetime.utcnow()
        if self.membership_end <= now:
            return 0
            
        delta = self.membership_end - now
        return delta.days

class TranslationRecord(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    filename = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    source_language = db.Column(db.String(10))
    target_language = db.Column(db.String(10))
    character_count = db.Column(db.Integer, default=0)
    
    @classmethod
    def get_recent(cls, limit=10):
        """Get the most recent translations."""
        return cls.query.order_by(cls.created_at.desc()).limit(limit).all() 