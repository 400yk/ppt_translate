import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from db.models import db
from api import register_blueprints
from flask_migrate import Migrate

# Environment loading is now handled in config.py
import config

def create_app():
    app = Flask(__name__)
    
    # Configure CORS to allow frontend origins
    cors_origins = [
        "https://translide-42ac7178fd60.herokuapp.com",  # Production frontend
        "http://localhost:9002",  # Local development frontend
        "http://127.0.0.1:9002",
        # Add the new official domain
        "https://translide.co"
    ]
    CORS(app, resources={r"/*": {"origins": cors_origins, "supports_credentials": True}})

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
    
    # Register all API blueprints (contains the actual implementations now)
    register_blueprints(app)

    # After initializing your app and db:
    migrate = Migrate(app, db)

    return app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True, host=os.getenv('API_HOST', '0.0.0.0'), port=int(os.getenv('API_PORT', 5000))) 