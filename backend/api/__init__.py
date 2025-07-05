"""
API package initialization file.
This file collects all API blueprints and provides a function to register them with a Flask app.
"""

from .translate_api import translate_bp
from .membership_api import membership_bp
from .payment_api import payment_bp
from .auth_api import auth_bp
from .user_api import user_bp
from .guest_api import guest_bp
from .pricing_api import pricing_bp
from .referral_api import referral_bp
from .feedback_api import feedback_bp

def register_blueprints(app):
    """Register all API blueprints with the Flask app."""
    app.register_blueprint(translate_bp)
    app.register_blueprint(membership_bp)
    app.register_blueprint(payment_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(guest_bp)
    app.register_blueprint(pricing_bp)
    app.register_blueprint(referral_bp)
    app.register_blueprint(feedback_bp) 