"""
API endpoints for handling guest operations.
"""

from flask import Blueprint, jsonify, request
import user_manager

guest_bp = Blueprint('guest', __name__)

@guest_bp.route('/api/guest/status', methods=['GET'])
def get_guest_status():
    """Get the guest translation status for the current IP."""
    client_ip = request.remote_addr
    
    # Get guest status
    status = user_manager.get_guest_status(client_ip)
    return jsonify(status), 200 