"""
API endpoints for handling user feedback submissions.
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from db.models import User, Feedback, db
import datetime

feedback_bp = Blueprint('feedback', __name__)

@feedback_bp.route('/api/feedback/submit', methods=['POST'])
def submit_feedback():
    """
    Submit user feedback (both authenticated and anonymous).
    
    Request body:
    {
        "feedback_text": "Great service!",
        "rating": 5,  // optional 1-5 star rating
        "user_email": "user@example.com",  // for anonymous feedback
        "page_context": "translation_page"  // optional context
    }
    """
    try:
        data = request.get_json()
        
        if not data or not data.get('feedback_text'):
            return jsonify({
                'error': 'Feedback text is required',
                'errorKey': 'errors.missing_feedback_text'
            }), 400
        
        feedback_text = data.get('feedback_text').strip()
        if len(feedback_text) < 10:
            return jsonify({
                'error': 'Feedback must be at least 10 characters long',
                'errorKey': 'errors.feedback_too_short'
            }), 400
        
        if len(feedback_text) > 2000:
            return jsonify({
                'error': 'Feedback must be less than 2000 characters',
                'errorKey': 'errors.feedback_too_long'
            }), 400
        
        rating = data.get('rating')
        if rating is not None:
            if not isinstance(rating, int) or rating < 1 or rating > 5:
                return jsonify({
                    'error': 'Rating must be between 1 and 5',
                    'errorKey': 'errors.invalid_rating'
                }), 400
        
        user_email = data.get('user_email')
        page_context = data.get('page_context', 'unknown')
        
        # Check if user is authenticated
        user_id = None
        try:
            from flask_jwt_extended import verify_jwt_in_request
            verify_jwt_in_request(optional=True)
            current_user = get_jwt_identity()
            if current_user:
                user = User.query.filter_by(username=current_user).first()
                if user:
                    user_id = user.id
                    user_email = user.email  # Use authenticated user's email
        except:
            pass  # Anonymous user
        
        # For anonymous users, require email
        if not user_id and not user_email:
            return jsonify({
                'error': 'Email is required for anonymous feedback',
                'errorKey': 'errors.missing_email_for_anonymous'
            }), 400
        
        # Validate email format if provided
        if user_email:
            import re
            email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if not re.match(email_pattern, user_email):
                return jsonify({
                    'error': 'Please provide a valid email address',
                    'errorKey': 'errors.invalid_email_format'
                }), 400
        
        # Create feedback record
        feedback = Feedback(
            user_id=user_id,
            feedback_text=feedback_text,
            rating=rating,
            user_email=user_email,
            page_context=page_context
        )
        
        db.session.add(feedback)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Thank you for your feedback!',
            'messageKey': 'feedback.submit_success',
            'feedback_id': feedback.id
        })
        
    except Exception as e:
        print(f"Error submitting feedback: {str(e)}")
        db.session.rollback()
        return jsonify({
            'error': 'Failed to submit feedback',
            'errorKey': 'errors.feedback_submit_failed',
            'message': str(e)
        }), 500

@feedback_bp.route('/api/feedback/admin', methods=['GET'])
@jwt_required()
def get_admin_feedback():
    """
    Get all feedback for admin review (paginated).
    
    Query parameters:
    - page: Page number (default: 1)
    - per_page: Items per page (default: 20, max: 100)
    - rating: Filter by rating (1-5)
    """
    try:
        username = get_jwt_identity()
        user = User.query.filter_by(username=username).first()
        
        if not user:
            return jsonify({
                'error': 'User not found',
                'errorKey': 'errors.user_not_found'
            }), 404
        
        # Use the new admin role system
        is_admin = user.is_administrator()
        
        if not is_admin:
            return jsonify({
                'error': 'Admin access required',
                'errorKey': 'errors.admin_access_required'
            }), 403
        
        # Pagination parameters
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        rating_filter = request.args.get('rating', type=int)
        
        # Build query
        query = Feedback.query
        
        if rating_filter:
            if 1 <= rating_filter <= 5:
                query = query.filter_by(rating=rating_filter)
        
        # Order by most recent first
        query = query.order_by(Feedback.created_at.desc())
        
        # Paginate
        feedback_pagination = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        feedback_list = []
        for feedback in feedback_pagination.items:
            feedback_data = {
                'id': feedback.id,
                'feedback_text': feedback.feedback_text,
                'rating': feedback.rating,
                'user_email': feedback.user_email,
                'page_context': feedback.page_context,
                'created_at': feedback.created_at.isoformat(),
                'submitter': feedback.get_submitter_identifier(),
                'is_anonymous': feedback.is_anonymous()
            }
            feedback_list.append(feedback_data)
        
        return jsonify({
            'success': True,
            'feedback': feedback_list,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': feedback_pagination.total,
                'pages': feedback_pagination.pages,
                'has_next': feedback_pagination.has_next,
                'has_prev': feedback_pagination.has_prev
            },
            'stats': {
                'total_feedback': Feedback.query.count(),
                'average_rating': Feedback.get_average_rating(),
                'rating_counts': {
                    str(i): Feedback.query.filter_by(rating=i).count() 
                    for i in range(1, 6)
                }
            }
        })
        
    except Exception as e:
        print(f"Error getting admin feedback: {str(e)}")
        return jsonify({
            'error': 'Failed to get feedback',
            'errorKey': 'errors.feedback_fetch_failed',
            'message': str(e)
        }), 500 