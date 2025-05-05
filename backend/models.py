from flask_sqlalchemy import SQLAlchemy
import datetime
import secrets
import string

db = SQLAlchemy()

class InvitationCode(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(12), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    max_uses = db.Column(db.Integer, default=10)
    uses = db.Column(db.Integer, default=0)
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
    def generate_batch(cls, count=50, max_uses=10):
        """Generate multiple invitation codes at once."""
        codes = []
        for _ in range(count):
            code = cls.generate_code()
            invitation = cls(code=code, max_uses=max_uses)
            db.session.add(invitation)
            codes.append(code)
        db.session.commit()
        return codes
    
    def increment_usage(self):
        """Increment the usage count for this code."""
        if self.uses < self.max_uses:
            self.uses += 1
            self.last_used = datetime.datetime.utcnow()
            db.session.commit()
            return True
        return False
    
    def is_valid(self):
        """Check if the invitation code is still valid."""
        return self.active and self.uses < self.max_uses
    
    def remaining_uses(self):
        """Get the number of uses remaining."""
        return max(0, self.max_uses - self.uses)
    
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
    password_hash = db.Column(db.String(128), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    last_login = db.Column(db.DateTime)
    invitation_code_id = db.Column(db.Integer, db.ForeignKey('invitation_code.id'))
    invitation_code = db.relationship('InvitationCode', backref=db.backref('users', lazy='dynamic'))
    translations = db.relationship('TranslationRecord', backref='user', lazy='dynamic')
    
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
    
    def record_translation(self, filename, src_lang, dest_lang):
        """Record a translation performed by this user."""
        translation = TranslationRecord(
            user_id=self.id,
            filename=filename,
            source_language=src_lang,
            target_language=dest_lang
        )
        db.session.add(translation)
        db.session.commit()
        return translation

class TranslationRecord(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    filename = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    source_language = db.Column(db.String(10))
    target_language = db.Column(db.String(10))
    
    @classmethod
    def get_recent(cls, limit=10):
        """Get the most recent translations."""
        return cls.query.order_by(cls.created_at.desc()).limit(limit).all() 