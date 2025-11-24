"""
Utility for managing temporary file storage for Celery tasks.
Stores uploaded files on disk instead of passing them through Redis.

IMPORTANT: This requires a shared filesystem between the backend API server
and the Celery worker. If they run on different machines/containers, you must
mount a shared volume at UPLOAD_TEMP_DIR or use S3/OSS storage instead.
"""
import os
import uuid
import tempfile
from datetime import datetime, timedelta
from pathlib import Path
from config import UPLOAD_TEMP_DIR, UPLOAD_FILE_TTL_HOURS


def save_uploaded_file(file_content: bytes, filename: str, task_id: str = None) -> str:
    """
    Save an uploaded file to temporary storage.
    
    Args:
        file_content: The file content as bytes
        filename: Original filename
        task_id: Optional task ID for naming (if None, generates UUID)
    
    Returns:
        Path to the saved file
    """
    # Ensure temp directory exists
    os.makedirs(UPLOAD_TEMP_DIR, exist_ok=True)
    
    # Generate unique filename
    if task_id:
        unique_id = task_id
    else:
        unique_id = str(uuid.uuid4())
    
    # Get file extension
    file_ext = os.path.splitext(filename)[1] or '.pptx'
    
    # Create full path
    file_path = os.path.join(UPLOAD_TEMP_DIR, f"{unique_id}_{filename}")
    
    # Save file
    with open(file_path, 'wb') as f:
        f.write(file_content)
    
    print(f"Saved uploaded file to: {file_path}")
    return file_path


def delete_file(file_path: str) -> bool:
    """
    Delete a file from storage.
    
    Args:
        file_path: Path to the file to delete
    
    Returns:
        True if deleted successfully, False otherwise
    """
    try:
        if os.path.exists(file_path):
            os.unlink(file_path)
            print(f"Deleted file: {file_path}")
            return True
        return False
    except Exception as e:
        print(f"Error deleting file {file_path}: {e}")
        return False


def cleanup_old_files(max_age_hours: int = None) -> int:
    """
    Clean up files older than the specified age.
    
    Args:
        max_age_hours: Maximum age in hours (defaults to UPLOAD_FILE_TTL_HOURS)
    
    Returns:
        Number of files deleted
    """
    if max_age_hours is None:
        max_age_hours = UPLOAD_FILE_TTL_HOURS
    
    if not os.path.exists(UPLOAD_TEMP_DIR):
        return 0
    
    deleted_count = 0
    cutoff_time = datetime.now() - timedelta(hours=max_age_hours)
    
    try:
        for filename in os.listdir(UPLOAD_TEMP_DIR):
            file_path = os.path.join(UPLOAD_TEMP_DIR, filename)
            try:
                # Check file modification time
                mtime = datetime.fromtimestamp(os.path.getmtime(file_path))
                if mtime < cutoff_time:
                    if delete_file(file_path):
                        deleted_count += 1
            except Exception as e:
                print(f"Error checking file {file_path}: {e}")
        
        print(f"Cleaned up {deleted_count} old files from {UPLOAD_TEMP_DIR}")
    except Exception as e:
        print(f"Error during cleanup: {e}")
    
    return deleted_count


def get_file_path(task_id: str, filename: str) -> str:
    """
    Get the expected file path for a given task_id and filename.
    This is used by the worker to locate the file.
    
    Args:
        task_id: Task ID
        filename: Original filename
    
    Returns:
        Expected file path
    """
    return os.path.join(UPLOAD_TEMP_DIR, f"{task_id}_{filename}")

