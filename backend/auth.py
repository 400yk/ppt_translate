"""
Redirects authentication routes to the API module.
This file is kept for backward compatibility.
"""

def register_routes(app):
    """
    Register authentication routes with the Flask app.
    This now delegates to the auth_api Blueprint.
    """
    # This function is now just a wrapper for the auth_api Blueprint
    # Routes are now defined in api/auth_api.py
    # We keep this function for backward compatibility
    pass 