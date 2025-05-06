import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from models import db
import auth  # Keep for compatibility
from api import register_blueprints

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

    # Call the legacy auth.register_routes for compatibility
    # This is now a no-op but kept for backwards compatibility
    auth.register_routes(app)
    
    # Register all API blueprints (contains the actual implementations now)
    register_blueprints(app)

    return app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True, host=os.getenv('API_HOST', '0.0.0.0'), port=int(os.getenv('API_PORT', 5000))) 