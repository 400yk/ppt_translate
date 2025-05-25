import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from db.models import db
from api import register_blueprints
from flask_migrate import Migrate
from celery import Task, Celery # Import Celery here
from celery_init import celery_app # Import celery_app from celery_init

# Environment loading is now handled in config.py
import config

# Celery configuration function
def configure_celery(app: Flask, celery_instance: Celery) -> Celery:
    celery_instance.conf.broker_url = app.config['CELERY_BROKER_URL']
    celery_instance.conf.result_backend = app.config['CELERY_RESULT_BACKEND']
    celery_instance.conf.include = ['services.tasks'] # Path to your tasks module
    celery_instance.conf.update(app.config)

    class ContextTask(Task):
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)

    celery_instance.Task = ContextTask
    # No need to return, modifies in place, but can return for chaining if preferred
    return celery_instance

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
    
    # Celery Configuration - get from environment variables or default to local Redis
    app.config.update(
        CELERY_BROKER_URL=os.environ.get('REDIS_URL', 'redis://localhost:6379/0'),
        CELERY_RESULT_BACKEND=os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
    )

    # Check if API keys are available
    if not os.getenv('GEMINI_API_KEY'):
        print("WARNING: GEMINI_API_KEY not found in environment variables")
        
    # Initialize extensions
    db.init_app(app)
    jwt = JWTManager(app)

    # Create tables if they don't exist
    # This should ideally be handled by migrations in a production setup
    # with app.app_context():
    #     db.create_all()
    
    # Register all API blueprints (contains the actual implementations now)
    register_blueprints(app)

    # After initializing your app and db:
    migrate = Migrate(app, db)

    # Configure the imported celery_app instance
    configure_celery(app, celery_app)

    return app

app = create_app()
# celery_app is already imported and now configured. No need to assign it from make_celery.

if __name__ == '__main__':
    # Note: This run command is for local development with Flask's built-in server.
    # For production, Gunicorn (for web) and Celery CLI (for workers) are used via Procfile.
    app.run(debug=True, host=os.getenv('API_HOST', '0.0.0.0'), port=int(os.getenv('API_PORT', 5000))) 