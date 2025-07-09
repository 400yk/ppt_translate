"""
Alicloud OSS service for handling file uploads and downloads as S3 fallback.
"""

import os
import uuid
import time
from datetime import datetime, timedelta
import config

try:
    import oss2
    OSS_AVAILABLE = True
except ImportError:
    OSS_AVAILABLE = False
    print("OSS library not installed. Install with: pip install oss2")

class OSSService:
    """Service for handling OSS file operations as S3 fallback."""
    
    def __init__(self):
        """Initialize OSS client if credentials are available."""
        self.oss_client = None
        self.bucket_name = config.ALICLOUD_OSS_BUCKET_NAME
        self.endpoint = config.ALICLOUD_OSS_ENDPOINT
        
        if config.USE_OSS_STORAGE and OSS_AVAILABLE:
            try:
                # Create OSS auth
                auth = oss2.Auth(
                    config.ALICLOUD_OSS_ACCESS_KEY_ID,
                    config.ALICLOUD_OSS_ACCESS_KEY_SECRET
                )
                
                # Create bucket client
                self.oss_client = oss2.Bucket(auth, self.endpoint, self.bucket_name)
                print(f"OSS client initialized for bucket: {self.bucket_name}")
                
                # Test connection
                try:
                    self.oss_client.get_bucket_info()
                    print("OSS connection test successful")
                except Exception as e:
                    print(f"OSS connection test failed: {e}")
                    self.oss_client = None
                    
            except Exception as e:
                print(f"Failed to initialize OSS client: {e}")
                self.oss_client = None
        else:
            if not config.USE_OSS_STORAGE:
                print("OSS storage disabled - missing credentials")
            if not OSS_AVAILABLE:
                print("OSS library not available")
    
    def is_available(self):
        """Check if OSS service is available."""
        return self.oss_client is not None
    
    def upload_file(self, file_path, task_id, original_filename, max_retries=3):
        """
        Upload a file to OSS with retry mechanism.
        
        Args:
            file_path: Local path to the file to upload
            task_id: Unique task ID for organizing files
            original_filename: Original filename for reference
            max_retries: Maximum number of retry attempts (default: 3)
            
        Returns:
            OSS key if successful, None if failed
        """
        if not self.is_available():
            print("OSS service not available")
            return None
        
        # Generate a unique OSS key (only once, outside the retry loop)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        file_extension = os.path.splitext(original_filename)[1]
        oss_key = f"translations/{timestamp}_{task_id}_{uuid.uuid4().hex[:8]}{file_extension}"
        
        # Progressive wait times: 5s, 15s, 30s
        wait_times = [5, 15, 30]
        
        for attempt in range(max_retries):
            try:
                print(f"OSS upload attempt {attempt + 1}/{max_retries} for {oss_key}")
                
                # Upload the file
                with open(file_path, 'rb') as f:
                    self.oss_client.put_object(
                        oss_key,
                        f,
                        headers={
                            'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                            'Content-Disposition': f'attachment; filename="{original_filename}"'
                        }
                    )
                
                print(f"File uploaded to OSS successfully: {oss_key}")
                return oss_key
                
            except oss2.exceptions.OssError as e:
                error_code = e.code
                error_message = e.message
                
                print(f"OSS upload attempt {attempt + 1} failed with OssError: {error_code} - {error_message}")
                
                # Check if error is retryable - comprehensive OSS error list
                retryable_errors = [
                    'SignatureDoesNotMatch',
                    'RequestTimeout',
                    'ServiceUnavailable', 
                    'InternalError',
                    'RequestTimeTooSkewed',
                    'CallbackFailed',
                    'SlowDown',           # Too many requests
                    'TooManyRequests',    # Rate limiting
                    'Throttling',         # OSS throttling
                    'OperationAborted',   # Operation interrupted
                    'BadGateway',         # Gateway errors
                    'ServiceError',       # Generic service error
                    'NetworkError',       # Network connectivity issues
                    'ConnectionTimeout',  # Connection timeout
                    'SocketTimeout',      # Socket timeout
                    'TemporaryRedirect'   # Temporary redirect
                ]
                
                if error_code in retryable_errors:
                    if attempt < max_retries - 1:  # Not the last attempt
                        wait_time = wait_times[attempt]
                        print(f"Retryable OSS error detected. Waiting {wait_time} seconds before retry...")
                        time.sleep(wait_time)
                        continue
                    else:
                        print(f"Max retries reached. OSS upload failed with retryable error: {error_code}")
                        return None
                else:
                    # Non-retryable error (access denied, bucket not found, etc.)
                    print(f"Non-retryable OSS error: {error_code}. Aborting upload.")
                    return None
                    
            except Exception as e:
                print(f"OSS upload attempt {attempt + 1} failed with unexpected error: {e}")
                
                if attempt < max_retries - 1:  # Not the last attempt
                    wait_time = wait_times[attempt]
                    print(f"Unexpected OSS error. Waiting {wait_time} seconds before retry...")
                    time.sleep(wait_time)
                    continue
                else:
                    print(f"Max retries reached. OSS upload failed with unexpected error: {e}")
                    return None
        
        print(f"All {max_retries} OSS upload attempts failed for {oss_key}")
        return None
    
    def generate_presigned_url(self, oss_key, expiration=3600, max_retries=3):
        """
        Generate a presigned URL for downloading a file from OSS with retry mechanism.
        
        Args:
            oss_key: OSS key of the file
            expiration: URL expiration time in seconds (default 1 hour)
            max_retries: Maximum number of retry attempts (default: 3)
            
        Returns:
            Presigned URL if successful, None if failed
        """
        if not self.is_available():
            print("OSS service not available")
            return None
        
        # Progressive wait times: 2s, 5s, 10s (shorter for URL generation)
        wait_times = [2, 5, 10]
        
        for attempt in range(max_retries):
            try:
                print(f"OSS presigned URL generation attempt {attempt + 1}/{max_retries} for {oss_key}")
                
                # Generate presigned URL
                url = self.oss_client.sign_url('GET', oss_key, expiration)
                print(f"Generated presigned URL for {oss_key}")
                return url
                
            except oss2.exceptions.OssError as e:
                error_code = e.code
                error_message = e.message
                
                print(f"OSS presigned URL attempt {attempt + 1} failed with OssError: {error_code} - {error_message}")
                
                # Check if error is retryable
                retryable_errors = [
                    'SignatureDoesNotMatch',
                    'RequestTimeout',
                    'ServiceUnavailable',
                    'InternalError',
                    'RequestTimeTooSkewed',
                    'SlowDown',
                    'TooManyRequests',
                    'Throttling',
                    'NetworkError',
                    'ConnectionTimeout',
                    'SocketTimeout'
                ]
                
                if error_code in retryable_errors:
                    if attempt < max_retries - 1:  # Not the last attempt
                        wait_time = wait_times[attempt]
                        print(f"Retryable OSS presigned URL error. Waiting {wait_time} seconds before retry...")
                        time.sleep(wait_time)
                        continue
                    else:
                        print(f"Max retries reached. OSS presigned URL failed with retryable error: {error_code}")
                        return None
                else:
                    # Non-retryable error
                    print(f"Non-retryable OSS presigned URL error: {error_code}. Aborting.")
                    return None
                    
            except Exception as e:
                print(f"OSS presigned URL attempt {attempt + 1} failed with unexpected error: {e}")
                
                if attempt < max_retries - 1:  # Not the last attempt
                    wait_time = wait_times[attempt]
                    print(f"Unexpected OSS presigned URL error. Waiting {wait_time} seconds before retry...")
                    time.sleep(wait_time)
                    continue
                else:
                    print(f"Max retries reached. OSS presigned URL failed with unexpected error: {e}")
                    return None
        
        print(f"All {max_retries} OSS presigned URL attempts failed for {oss_key}")
        return None
    
    def delete_file(self, oss_key, max_retries=3):
        """
        Delete a file from OSS with retry mechanism.
        
        Args:
            oss_key: OSS key of the file to delete
            max_retries: Maximum number of retry attempts (default: 3)
            
        Returns:
            True if successful, False if failed
        """
        if not self.is_available():
            print("OSS service not available")
            return False
        
        # Progressive wait times: 2s, 5s, 10s (shorter for deletion)
        wait_times = [2, 5, 10]
        
        for attempt in range(max_retries):
            try:
                print(f"OSS delete attempt {attempt + 1}/{max_retries} for {oss_key}")
                
                self.oss_client.delete_object(oss_key)
                print(f"File deleted from OSS: {oss_key}")
                return True
                
            except oss2.exceptions.OssError as e:
                error_code = e.code
                error_message = e.message
                
                print(f"OSS delete attempt {attempt + 1} failed with OssError: {error_code} - {error_message}")
                
                # Check if error is retryable
                retryable_errors = [
                    'SignatureDoesNotMatch',
                    'RequestTimeout',
                    'ServiceUnavailable',
                    'InternalError',
                    'RequestTimeTooSkewed',
                    'SlowDown',
                    'TooManyRequests',
                    'Throttling',
                    'NetworkError',
                    'ConnectionTimeout',
                    'SocketTimeout'
                ]
                
                # Special case: NoSuchKey is actually success for deletion
                if error_code == 'NoSuchKey':
                    print(f"File {oss_key} doesn't exist (already deleted). Treating as success.")
                    return True
                
                if error_code in retryable_errors:
                    if attempt < max_retries - 1:  # Not the last attempt
                        wait_time = wait_times[attempt]
                        print(f"Retryable OSS delete error. Waiting {wait_time} seconds before retry...")
                        time.sleep(wait_time)
                        continue
                    else:
                        print(f"Max retries reached. OSS delete failed with retryable error: {error_code}")
                        return False
                else:
                    # Non-retryable error
                    print(f"Non-retryable OSS delete error: {error_code}. Aborting.")
                    return False
                    
            except Exception as e:
                print(f"OSS delete attempt {attempt + 1} failed with unexpected error: {e}")
                
                if attempt < max_retries - 1:  # Not the last attempt
                    wait_time = wait_times[attempt]
                    print(f"Unexpected OSS delete error. Waiting {wait_time} seconds before retry...")
                    time.sleep(wait_time)
                    continue
                else:
                    print(f"Max retries reached. OSS delete failed with unexpected error: {e}")
                    return False
        
        print(f"All {max_retries} OSS delete attempts failed for {oss_key}")
        return False

# Global OSS service instance
oss_service = OSSService() 