import os
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from models import db
from dotenv import load_dotenv
import auth
import translate

# Load Gemini API key from .env - try multiple locations
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)

# Try loading .env from different possible locations
env_paths = [
    os.path.join(root_dir, '.env'),  # root project directory
    os.path.join(current_dir, '.env'),  # backend directory
    '.env'  # current working directory
]

for env_path in env_paths:
    if os.path.exists(env_path):
        print(f"Loading environment from: {env_path}")
        load_dotenv(env_path)
        break
else:
    print("Warning: Could not find .env file in any of the expected locations")

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
if not GEMINI_API_KEY:
    print("ERROR: GEMINI_API_KEY not found in environment variables")

def create_app():
    app = Flask(__name__)
    CORS(app)

    # Configure the Flask app from config.py
    from config import SECRET_KEY, JWT_SECRET_KEY, SQLALCHEMY_DATABASE_URI, SQLALCHEMY_TRACK_MODIFICATIONS
    app.config['SECRET_KEY'] = SECRET_KEY
    app.config['JWT_SECRET_KEY'] = JWT_SECRET_KEY
    app.config['SQLALCHEMY_DATABASE_URI'] = SQLALCHEMY_DATABASE_URI
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = SQLALCHEMY_TRACK_MODIFICATIONS

    # Initialize extensions
    db.init_app(app)
    jwt = JWTManager(app)

    # Create tables if they don't exist
    with app.app_context():
        db.create_all()

    # Register routes from modules
    auth.register_routes(app)
    translate.register_routes(app)

    return app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0') 