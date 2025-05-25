import io
import os
from celery_init import celery_app # Import from celery_init
from services.translate_service import translate_pptx as original_translate_pptx
from services.s3_service import s3_service
from db.models import User, GuestTranslation, db # Assuming User and db are accessible

@celery_app.task(bind=True)
def process_translation_task(self, user_id: int, original_file_content_bytes: bytes, original_filename: str, src_lang: str, dest_lang: str):
    """
    Celery task to translate a PPTX file.
    original_file_content_bytes: The content of the uploaded file as bytes.
    """
    print(f"Celery task {self.request.id}: Starting translation for user {user_id}, file {original_filename}")
    
    try:
        # Reconstruct a file-like stream from bytes
        file_stream = io.BytesIO(original_file_content_bytes)
        
        # Call the original translation service function
        # This function saves the translated file to a temporary path on the worker
        translated_file_path, character_count = original_translate_pptx(file_stream, src_lang, dest_lang)
        
        # Fetch the user (ensure app context if not using ContextTask from make_celery)
        user = User.query.get(user_id)
        if not user:
            error_msg = f"User with ID {user_id} not found. Cannot record translation."
            print(f"Celery task {self.request.id}: {error_msg}")
            # Decide how to handle this - fail the task or just log?
            # For now, we'll let it proceed but the translation won't be recorded for the user.
            # raise FictionalTaskError(error_msg) # if you want to mark task as failed
        else:
            try:
                user.record_translation(original_filename, src_lang, dest_lang, character_count)
                db.session.commit() # Commit after recording
                print(f"Celery task {self.request.id}: Translation recorded for user {user_id}")
            except Exception as e:
                db.session.rollback()
                print(f"Celery task {self.request.id}: Error recording translation for user {user_id}: {e}")
                # Optionally re-raise to mark task as failed due to recording error
                # raise

        print(f"Celery task {self.request.id}: Translation successful. File at: {translated_file_path}, Chars: {character_count}")
        
        # Try to upload to S3 if available
        s3_key = None
        download_url = None
        
        if s3_service.is_available():
            try:
                s3_key = s3_service.upload_file(translated_file_path, self.request.id, f"translated_{original_filename}")
                if s3_key:
                    # Generate a presigned URL for download (valid for 24 hours)
                    download_url = s3_service.generate_presigned_url(s3_key, expiration=86400)
                    print(f"Celery task {self.request.id}: File uploaded to S3: {s3_key}")
                    
                    # Clean up local file after successful S3 upload
                    try:
                        os.unlink(translated_file_path)
                        print(f"Celery task {self.request.id}: Local file cleaned up")
                    except Exception as e:
                        print(f"Celery task {self.request.id}: Warning - could not clean up local file: {e}")
                else:
                    print(f"Celery task {self.request.id}: S3 upload failed, keeping local file")
            except Exception as e:
                print(f"Celery task {self.request.id}: Error uploading to S3: {e}")
        else:
            print(f"Celery task {self.request.id}: S3 not available, using local storage")
        
        # The task needs to return information that the client can use.
        result = {
            'status': 'SUCCESS',
            'message': 'File translated successfully.',
            'original_filename': original_filename,
            'character_count': character_count
        }
        
        # Include appropriate file reference based on storage method
        if s3_key and download_url:
            result['s3_key'] = s3_key
            result['download_url'] = download_url
            result['storage_type'] = 's3'
        else:
            result['translated_file_path'] = translated_file_path  # Path on the WORKER dyno
            result['storage_type'] = 'local'
        
        return result
    except Exception as e:
        print(f"Celery task {self.request.id}: Error during translation: {e}")
        import traceback
        traceback.print_exc()
        # Optionally, re-raise to mark the task as FAILED in Celery
        # For now, it returns an error structure
        # self.update_state(state='FAILURE', meta={'exc_type': type(e).__name__, 'exc_message': str(e)})
        raise # Re-raising will mark task as FAILED 

@celery_app.task(bind=True)
def process_guest_translation_task(self, client_ip: str, original_file_content_bytes: bytes, original_filename: str, src_lang: str, dest_lang: str, estimated_character_count: int):
    """
    Celery task to translate a PPTX file for guest users.
    """
    print(f"Celery guest task {self.request.id}: Starting translation for IP {client_ip}, file {original_filename}")
    
    try:
        # Reconstruct a file-like stream from bytes
        file_stream = io.BytesIO(original_file_content_bytes)
        
        # Call the original translation service function
        # This function saves the translated file to a temporary path on the worker
        translated_file_path, character_count = original_translate_pptx(file_stream, src_lang, dest_lang)
        
        # Update the guest translation record with actual character count
        try:
            latest_translation = GuestTranslation.query.filter_by(ip_address=client_ip).order_by(GuestTranslation.created_at.desc()).first()
            if latest_translation:
                latest_translation.character_count = character_count
                db.session.commit()
                print(f"Celery guest task {self.request.id}: Translation recorded for IP {client_ip}")
        except Exception as e:
            db.session.rollback()
            print(f"Celery guest task {self.request.id}: Error recording translation for IP {client_ip}: {e}")

        print(f"Celery guest task {self.request.id}: Translation successful. File at: {translated_file_path}, Chars: {character_count}")
        
        # Try to upload to S3 if available
        s3_key = None
        download_url = None
        
        if s3_service.is_available():
            try:
                s3_key = s3_service.upload_file(translated_file_path, self.request.id, f"translated_{original_filename}")
                if s3_key:
                    # Generate a presigned URL for download (valid for 24 hours)
                    download_url = s3_service.generate_presigned_url(s3_key, expiration=86400)
                    print(f"Celery guest task {self.request.id}: File uploaded to S3: {s3_key}")
                    
                    # Clean up local file after successful S3 upload
                    try:
                        os.unlink(translated_file_path)
                        print(f"Celery guest task {self.request.id}: Local file cleaned up")
                    except Exception as e:
                        print(f"Celery guest task {self.request.id}: Warning - could not clean up local file: {e}")
                else:
                    print(f"Celery guest task {self.request.id}: S3 upload failed, keeping local file")
            except Exception as e:
                print(f"Celery guest task {self.request.id}: Error uploading to S3: {e}")
        else:
            print(f"Celery guest task {self.request.id}: S3 not available, using local storage")
        
        # Return information that the client can use
        result = {
            'status': 'SUCCESS',
            'message': 'File translated successfully.',
            'original_filename': original_filename,
            'character_count': character_count
        }
        
        # Include appropriate file reference based on storage method
        if s3_key and download_url:
            result['s3_key'] = s3_key
            result['download_url'] = download_url
            result['storage_type'] = 's3'
        else:
            result['translated_file_path'] = translated_file_path  # Path on the WORKER dyno
            result['storage_type'] = 'local'
        
        return result
    except Exception as e:
        print(f"Celery guest task {self.request.id}: Error during translation: {e}")
        import traceback
        traceback.print_exc()
        # Re-raising will mark task as FAILED 
        raise 