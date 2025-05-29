"""
API endpoints for handling PowerPoint translation requests.
"""
from flask import request, send_file, jsonify, make_response, Blueprint, current_app, redirect
from flask_jwt_extended import jwt_required, get_jwt_identity
from db.models import User, db
from services.user_service import check_user_permission
from services.tasks import process_translation_task
from services.s3_service import s3_service
import os

translate_bp = Blueprint('translate', __name__)

@translate_bp.route('/api/translate_async_start', methods=['POST'])
@jwt_required()
def translate_async_start_endpoint():
    """Endpoint to start asynchronous translation of PowerPoint files."""
    username = get_jwt_identity()
    user = User.query.filter_by(username=username).first()
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
        
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
        
    if not file.filename.lower().endswith('.pptx'):
        return jsonify({
            'error': 'Invalid file format. Only .pptx files are supported.'
        }), 400
        
    src_lang = request.form.get('src_lang', 'zh')
    dest_lang = request.form.get('dest_lang', 'en')
    
    print(f"API: Received file for async translation: {file.filename}")
    print(f"API: Source lang: {src_lang}, Target lang: {dest_lang}, User: {user.id}")

    try:
        permission_result = check_user_permission(user)
        
        allowed, permission_data = permission_result

        if not allowed:
            response_obj, status_code = permission_data
            return response_obj, status_code
        
        # If we reach here, permission is True and permission_data is None, so proceed.

        # Read file content into bytes to pass to Celery task
        file_bytes = file.read()
        file.stream.seek(0) # Reset stream position if file object is used elsewhere, though not strictly needed here as we use bytes

        # Dispatch the Celery task
        task = process_translation_task.delay(
            user_id=user.id, 
            original_file_content_bytes=file_bytes, 
            original_filename=file.filename, 
            src_lang=src_lang, 
            dest_lang=dest_lang
        )
        
        print(f"API: Dispatched Celery task ID: {task.id}")
        return jsonify({'message': 'Translation task started', 'task_id': task.id}), 202
    except Exception as e:
        print(f"API: Error dispatching Celery task: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Could not start translation task', 'details': str(e)}), 500

@translate_bp.route('/api/translate_status/<task_id>', methods=['GET'])
@jwt_required() # Or remove if status can be public, or implement different auth
def get_translation_status_endpoint(task_id):
    """Endpoint to check the status of a translation task."""
    # It's good practice to ensure the user asking for status is allowed to see it,
    # e.g., by checking if the task_id belongs to them. Not implemented here for brevity.
    username = get_jwt_identity()
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    task = process_translation_task.AsyncResult(task_id)
    
    response_data = {
        'task_id': task_id,
        'status': task.state
    }
    
    if task.state == 'PENDING':
        response_data['message'] = 'Task is pending or unknown.'
    elif task.state == 'PROGRESS': # If your task supports custom progress updates
        response_data['message'] = 'Task is in progress.'
        response_data['progress'] = task.info.get('progress', 0) 
    elif task.state == 'SUCCESS':
        response_data['message'] = 'Task completed successfully.'
        response_data['result'] = task.result 
        # Add download URL for the translated file
        if task.result:
            if task.result.get('storage_type') == 's3' and task.result.get('download_url'):
                # For S3 storage, use the presigned URL directly
                response_data['result']['download_url'] = task.result['download_url']
            elif 'translated_file_path' in task.result:
                # For local storage, use the download endpoint
                response_data['result']['download_url'] = f'/api/download/{task_id}'
    elif task.state == 'FAILURE':
        response_data['message'] = 'Task failed.'
        # Provide a more generic error or log the details for privacy/security
        response_data['error'] = 'An error occurred during translation processing.' 
        # For debugging, you might include task.info (which contains exception)
        # print(f"Task {task_id} failed: {task.info}") 
    
    return jsonify(response_data)

@translate_bp.route('/api/download/<task_id>', methods=['GET'])
@jwt_required()
def download_translated_file(task_id):
    """Endpoint to download the translated file."""
    username = get_jwt_identity()
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    task = process_translation_task.AsyncResult(task_id)
    
    if task.state != 'SUCCESS':
        return jsonify({'error': 'Translation not completed or failed'}), 400
        
    if not task.result:
        return jsonify({'error': 'Translated file not found'}), 404
    
    # Handle S3 storage
    if task.result.get('storage_type') == 's3':
        if task.result.get('download_url'):
            # Redirect to the S3 presigned URL
            return redirect(task.result['download_url'])
        elif task.result.get('s3_key'):
            # Generate a new presigned URL if the old one expired
            download_url = s3_service.generate_presigned_url(task.result['s3_key'], expiration=3600)
            if download_url:
                return redirect(download_url)
            else:
                return jsonify({'error': 'Could not generate download URL'}), 500
        else:
            return jsonify({'error': 'S3 file reference not found'}), 404
    
    # Handle local storage (fallback)
    elif 'translated_file_path' in task.result:
        file_path = task.result['translated_file_path']
        original_filename = task.result.get('original_filename', 'translated_file.pptx')
        
        if not os.path.exists(file_path):
            return jsonify({'error': 'File no longer exists'}), 404
            
        try:
            response = make_response(send_file(file_path, as_attachment=True, 
                                             download_name=f"translated_{original_filename}"))
            response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
            return response
        except Exception as e:
            print(f"Error downloading file: {e}")
            return jsonify({'error': 'Error downloading file'}), 500
    else:
        return jsonify({'error': 'No file reference found'}), 404

@translate_bp.route('/api/translations/history', methods=['GET'])
@jwt_required()
def get_translation_history():
    username = get_jwt_identity()
    user = User.query.filter_by(username=username).first()
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    # Get the user's translation history
    translations = user.translations.order_by(db.desc('created_at')).all()
    
    history = []
    for translation in translations:
        history.append({
            'id': translation.id,
            'filename': translation.filename,
            'date': translation.created_at.isoformat(),
            'source_language': translation.source_language,
            'target_language': translation.target_language
        })
        
    return jsonify({
        'count': len(history),
        'translations': history
    }), 200 