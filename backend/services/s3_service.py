"""
AWS S3 service for handling file uploads and downloads.
"""

import boto3
import os
import uuid
from datetime import datetime, timedelta
from botocore.exceptions import ClientError, NoCredentialsError
import config

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
    
    def upload_file(self, file_path, task_id, original_filename):
        """
        Upload a file to S3.
        
        Args:
            file_path: Local path to the file to upload
            task_id: Unique task ID for organizing files
            original_filename: Original filename for reference
            
        Returns:
            S3 key if successful, None if failed
        """
        if not self.is_available():
            print("S3 service not available")
            return None
            
        try:
            # Generate a unique S3 key
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            file_extension = os.path.splitext(original_filename)[1]
            s3_key = f"translations/{timestamp}_{task_id}_{uuid.uuid4().hex[:8]}{file_extension}"
            
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
            
            print(f"File uploaded to S3: {s3_key}")
            return s3_key
            
        except ClientError as e:
            print(f"Error uploading file to S3: {e}")
            return None
        except Exception as e:
            print(f"Unexpected error uploading to S3: {e}")
            return None
    
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