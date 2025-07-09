"""
AWS S3 service for handling file uploads and downloads.
"""

import boto3
import os
import uuid
import time
from datetime import datetime, timedelta
from botocore.exceptions import ClientError, NoCredentialsError
import config

# Import OSS service for fallback
try:
    from services.oss_service import oss_service
    OSS_FALLBACK_AVAILABLE = True
except ImportError:
    OSS_FALLBACK_AVAILABLE = False
    print("OSS fallback not available - oss_service import failed")

class S3Service:
    """Service for handling S3 file operations."""
    
    def __init__(self):
        """Initialize S3 client if credentials are available."""
        self.s3_client = None
        self.bucket_name = config.AWS_S3_BUCKET_NAME
        
        if config.USE_S3_STORAGE:
            try:
                self.s3_client = boto3.client(
                    's3',
                    aws_access_key_id=config.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=config.AWS_SECRET_ACCESS_KEY,
                    region_name=config.AWS_S3_REGION
                )
                print(f"S3 client initialized for bucket: {self.bucket_name}")
            except NoCredentialsError:
                print("AWS credentials not found. S3 storage disabled.")
                self.s3_client = None
        else:
            print("S3 storage disabled - missing credentials")
    
    def is_available(self):
        """Check if S3 service is available."""
        return self.s3_client is not None
    
    def upload_file(self, file_path, task_id, original_filename, max_retries=3):
        """
        Upload a file to S3 with retry mechanism.
        
        Args:
            file_path: Local path to the file to upload
            task_id: Unique task ID for organizing files
            original_filename: Original filename for reference
            max_retries: Maximum number of retry attempts (default: 3)
            
        Returns:
            S3 key if successful, None if failed
        """
        if not self.is_available():
            print("S3 service not available")
            return None
        
        # Generate a unique S3 key (only once, outside the retry loop)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        file_extension = os.path.splitext(original_filename)[1]
        s3_key = f"translations/{timestamp}_{task_id}_{uuid.uuid4().hex[:8]}{file_extension}"
        
        # Progressive wait times: 5s, 15s, 30s
        wait_times = [5, 15, 30]
        
        for attempt in range(max_retries):
            try:
                print(f"S3 upload attempt {attempt + 1}/{max_retries} for {s3_key}")
                
                # Upload the file
                self.s3_client.upload_file(
                    file_path, 
                    self.bucket_name, 
                    s3_key,
                    ExtraArgs={
                        'ContentType': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                        'ContentDisposition': f'attachment; filename="{original_filename}"'
                    }
                )
                
                print(f"File uploaded to S3 successfully: {s3_key}")
                return s3_key
                
            except ClientError as e:
                error_code = e.response['Error']['Code']
                error_message = e.response['Error']['Message']
                
                print(f"S3 upload attempt {attempt + 1} failed with ClientError: {error_code} - {error_message}")
                
                # Check if error is retryable
                retryable_errors = [
                    'SignatureDoesNotMatch',  # Time sync issues
                    'RequestTimeout',         # Temporary network issues
                    'ServiceUnavailable',     # AWS service temporarily unavailable
                    'SlowDown',              # Rate limiting
                    'InternalError',         # AWS internal errors
                    'BadGateway',            # Gateway errors
                    'RequestTimeTooSkewed'   # Time synchronization issues
                ]
                
                if error_code in retryable_errors:
                    if attempt < max_retries - 1:  # Not the last attempt
                        wait_time = wait_times[attempt]
                        print(f"Retryable error detected. Waiting {wait_time} seconds before retry...")
                        time.sleep(wait_time)
                        continue
                    else:
                        print(f"Max retries reached. Upload failed with retryable error: {error_code}")
                        return None
                else:
                    # Non-retryable error (access denied, bucket not found, etc.)
                    print(f"Non-retryable error: {error_code}. Aborting upload.")
                    return None
                    
            except Exception as e:
                print(f"S3 upload attempt {attempt + 1} failed with unexpected error: {e}")
                
                if attempt < max_retries - 1:  # Not the last attempt
                    wait_time = wait_times[attempt]
                    print(f"Unexpected error. Waiting {wait_time} seconds before retry...")
                    time.sleep(wait_time)
                    continue
                else:
                    print(f"Max retries reached. Upload failed with unexpected error: {e}")
                    return None
        
        print(f"All {max_retries} upload attempts failed for {s3_key}")
        return None
    
    def upload_file_with_fallback(self, file_path, task_id, original_filename, max_retries=3):
        """
        Upload a file to S3 with OSS fallback if S3 fails.
        
        Args:
            file_path: Local path to the file to upload
            task_id: Unique task ID for organizing files
            original_filename: Original filename for reference
            max_retries: Maximum number of retry attempts for each service
            
        Returns:
            Dict with upload result: {
                'success': bool,
                'service': 's3' or 'oss' or None,
                'key': str or None,
                'download_url': str or None,
                'error': str or None
            }
        """
        result = {
            'success': False,
            'service': None,
            'key': None,
            'download_url': None,
            'error': None
        }
        
        # Try S3 first
        print("Attempting upload to S3...")
        s3_key = self.upload_file(file_path, task_id, original_filename, max_retries)
        
        if s3_key:
            print(f"S3 upload successful: {s3_key}")
            # Generate presigned URL for S3
            download_url = self.generate_presigned_url(s3_key, expiration=86400)  # 24 hours
            
            result.update({
                'success': True,
                'service': 's3',
                'key': s3_key,
                'download_url': download_url
            })
            return result
        
        # S3 failed, try OSS fallback
        print("S3 upload failed, attempting OSS fallback...")
        
        if not OSS_FALLBACK_AVAILABLE:
            result['error'] = "S3 upload failed and OSS fallback not available"
            print(result['error'])
            return result
        
        if not oss_service.is_available():
            result['error'] = "S3 upload failed and OSS service not available"
            print(result['error'])
            return result
        
        # Try OSS upload
        oss_key = oss_service.upload_file(file_path, task_id, original_filename, max_retries)
        
        if oss_key:
            print(f"OSS fallback upload successful: {oss_key}")
            # Generate presigned URL for OSS
            download_url = oss_service.generate_presigned_url(oss_key, expiration=86400)  # 24 hours
            
            result.update({
                'success': True,
                'service': 'oss',
                'key': oss_key,
                'download_url': download_url
            })
            return result
        
        # Both S3 and OSS failed
        result['error'] = "Both S3 and OSS uploads failed"
        print(result['error'])
        return result
    
    def generate_presigned_url(self, s3_key, expiration=3600):
        """
        Generate a presigned URL for downloading a file.
        
        Args:
            s3_key: S3 key of the file
            expiration: URL expiration time in seconds (default 1 hour)
            
        Returns:
            Presigned URL if successful, None if failed
        """
        if not self.is_available():
            print("S3 service not available")
            return None
            
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': s3_key},
                ExpiresIn=expiration
            )
            print(f"Generated presigned URL for {s3_key}")
            return url
            
        except ClientError as e:
            print(f"Error generating presigned URL: {e}")
            return None
    
    def delete_file(self, s3_key):
        """
        Delete a file from S3.
        
        Args:
            s3_key: S3 key of the file to delete
            
        Returns:
            True if successful, False if failed
        """
        if not self.is_available():
            print("S3 service not available")
            return False
            
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=s3_key)
            print(f"File deleted from S3: {s3_key}")
            return True
            
        except ClientError as e:
            print(f"Error deleting file from S3: {e}")
            return False

# Global S3 service instance
s3_service = S3Service() 