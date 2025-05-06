import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from models import db
import auth
import translate
from pricing import pricing_bp
import membership_api
import payment_api

# Environment loading is now handled in config.py
import config

def create_app():
    app = Flask(__name__)
    CORS(app)

    # Configure the Flask app from config.py
    app.config['SECRET_KEY'] = config.SECRET_KEY
    app.config['JWT_SECRET_KEY'] = config.JWT_SECRET_KEY
    app.config['SQLALCHEMY_DATABASE_URI'] = config.SQLALCHEMY_DATABASE_URI
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = config.SQLALCHEMY_TRACK_MODIFICATIONS

    # Check if API keys are available
    if not os.getenv('GEMINI_API_KEY'):
        print("WARNING: GEMINI_API_KEY not found in environment variables")
        
    # Initialize extensions
    db.init_app(app)
    jwt = JWTManager(app)

    # Create tables if they don't exist
    with app.app_context():
        db.create_all()

    # Register routes from modules
    auth.register_routes(app)
    translate.register_routes(app)
    app.register_blueprint(pricing_bp)
    app.register_blueprint(membership_api.membership_bp)
    app.register_blueprint(payment_api.payment_bp)

    return app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True, host=os.getenv('API_HOST', '0.0.0.0'), port=int(os.getenv('API_PORT', 5000))) 