"""
API endpoints for handling guest operations.
"""

from flask import Blueprint, jsonify, request
from services.user_service import get_guest_status

guest_bp = Blueprint('guest', __name__)

@guest_bp.route('/api/guest/status', methods=['GET'])
def guest_status():
    """Get the guest translation status for the current IP."""
    client_ip = request.remote_addr
    
    # Get guest status
    status = get_guest_status(client_ip)
    return jsonify(status), 200 