"""
Utility functions for the backend API.
"""

from flask import jsonify

def error_response(message, error_key=None, status_code=400):
    """
    Create a consistent error response with translation key support.
    
    Args:
        message: The error message
        error_key: The translation key for the error message
        status_code: The HTTP status code
        
    Returns:
        A tuple of (response, status_code)
    """
    response = {
        'error': message
    }
    
    if error_key:
        response['errorKey'] = error_key
    
    return jsonify(response), status_code

def success_response(data=None, message=None, message_key=None, status_code=200):
    """
    Create a consistent success response with translation key support.
    
    Args:
        data: The response data (dict)
        message: The success message
        message_key: The translation key for the success message
        status_code: The HTTP status code
        
    Returns:
        A tuple of (response, status_code)
    """
    response = data or {}
    
    if message:
        response['message'] = message
    
    if message_key:
        response['messageKey'] = message_key
    
    return jsonify(response), status_code 