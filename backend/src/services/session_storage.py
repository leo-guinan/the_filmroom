import os
import json
import boto3
from typing import Dict, Any, Optional, List
from datetime import datetime
from botocore.exceptions import ClientError
from src.core import settings, get_logger

logger = get_logger(__name__)


class SessionStorageService:
    """Service for managing session recordings with organized S3 structure."""
    
    def __init__(self):
        """Initialize S3 client if credentials are available."""
        self.s3_client = None
        if settings.aws_access_key_id and settings.aws_secret_access_key:
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=settings.aws_access_key_id,
                aws_secret_access_key=settings.aws_secret_access_key,
                region_name=settings.aws_region
            )
            logger.info(f"S3 client initialized for bucket: {settings.aws_s3_bucket}")
        else:
            logger.warning("AWS credentials not configured, S3 operations will be disabled")
    
    def generate_s3_key(self, coach_id: str, client_id: str, session_date: datetime, filename: str) -> str:
        """
        Generate S3 key with structure: coaches/{coach_id}/clients/{client_id}/{date}/{filename}
        
        Args:
            coach_id: ID of the coach
            client_id: ID of the client
            session_date: Date of the session
            filename: Name of the file
        
        Returns:
            S3 key string
        """
        date_str = session_date.strftime('%Y-%m-%d')
        return f"coaches/{coach_id}/clients/{client_id}/{date_str}/{filename}"
    
    def list_coach_sessions(self, coach_id: str, client_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        List all sessions for a coach, optionally filtered by client.
        
        Args:
            coach_id: ID of the coach
            client_id: Optional client ID to filter by
        
        Returns:
            List of session metadata
        """
        if not self.s3_client:
            logger.warning("S3 client not initialized")
            return []
        
        try:
            prefix = f"coaches/{coach_id}/"
            if client_id:
                prefix += f"clients/{client_id}/"
            
            paginator = self.s3_client.get_paginator('list_objects_v2')
            pages = paginator.paginate(
                Bucket=settings.aws_s3_bucket,
                Prefix=prefix
            )
            
            sessions = []
            for page in pages:
                if 'Contents' not in page:
                    continue
                
                for obj in page['Contents']:
                    key = obj['Key']
                    # Parse the key to extract metadata
                    parts = key.split('/')
                    if len(parts) >= 5:  # coaches/{coach_id}/clients/{client_id}/{date}/{filename}
                        session_info = {
                            'key': key,
                            'coach_id': parts[1],
                            'client_id': parts[3],
                            'date': parts[4],
                            'filename': '/'.join(parts[5:]),
                            'size': obj['Size'],
                            'last_modified': obj['LastModified'].isoformat(),
                            'etag': obj['ETag'].strip('"')
                        }
                        sessions.append(session_info)
            
            # Sort by date descending
            sessions.sort(key=lambda x: x['date'], reverse=True)
            return sessions
            
        except ClientError as e:
            logger.error(f"Failed to list sessions from S3: {e}")
            return []
    
    def list_coach_clients(self, coach_id: str) -> List[str]:
        """
        List all unique clients for a coach based on S3 structure.
        
        Args:
            coach_id: ID of the coach
        
        Returns:
            List of client IDs
        """
        if not self.s3_client:
            logger.warning("S3 client not initialized")
            return []
        
        try:
            prefix = f"coaches/{coach_id}/clients/"
            
            result = self.s3_client.list_objects_v2(
                Bucket=settings.aws_s3_bucket,
                Prefix=prefix,
                Delimiter='/'
            )
            
            clients = []
            if 'CommonPrefixes' in result:
                for prefix_info in result['CommonPrefixes']:
                    # Extract client_id from prefix
                    client_path = prefix_info['Prefix']
                    client_id = client_path.split('/')[-2]  # Get second to last element
                    clients.append(client_id)
            
            return clients
            
        except ClientError as e:
            logger.error(f"Failed to list clients from S3: {e}")
            return []
    
    def upload_session_recording(self, file_path: str, coach_id: str, client_id: str, 
                                session_date: datetime, filename: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Upload a session recording with organized structure.
        
        Args:
            file_path: Local path to the file
            coach_id: ID of the coach
            client_id: ID of the client
            session_date: Date of the session
            filename: Optional custom filename (defaults to original filename)
        
        Returns:
            Dict with upload details including S3 key and presigned URL
        """
        if not self.s3_client:
            logger.warning("S3 client not initialized")
            return None
        
        try:
            # Use original filename if not provided
            if not filename:
                filename = os.path.basename(file_path)
            
            # Generate S3 key
            s3_key = self.generate_s3_key(coach_id, client_id, session_date, filename)
            
            # Get file size
            file_size = os.path.getsize(file_path)
            
            # Determine content type
            content_type = 'video/mp4'
            if filename.lower().endswith('.webm'):
                content_type = 'video/webm'
            elif filename.lower().endswith('.mov'):
                content_type = 'video/quicktime'
            
            # Upload file with metadata
            metadata = {
                'coach_id': coach_id,
                'client_id': client_id,
                'session_date': session_date.isoformat(),
                'uploaded_at': datetime.utcnow().isoformat()
            }
            
            self.s3_client.upload_file(
                file_path,
                settings.aws_s3_bucket,
                s3_key,
                ExtraArgs={
                    'ContentType': content_type,
                    'Metadata': metadata
                }
            )
            
            # Generate presigned URL (valid for 7 days)
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': settings.aws_s3_bucket, 'Key': s3_key},
                ExpiresIn=604800  # 7 days
            )
            
            logger.info(f"Session recording uploaded to S3: {s3_key}")
            
            return {
                's3_key': s3_key,
                'url': url,
                'size': file_size,
                'content_type': content_type,
                'metadata': metadata
            }
            
        except ClientError as e:
            logger.error(f"Failed to upload session recording to S3: {e}")
            return None
    
    def get_session_url(self, s3_key: str, expiry_seconds: int = 3600) -> Optional[str]:
        """
        Generate a presigned URL for accessing a session recording.
        
        Args:
            s3_key: S3 key of the recording
            expiry_seconds: URL expiry time in seconds
        
        Returns:
            Presigned URL or None if failed
        """
        if not self.s3_client:
            logger.warning("S3 client not initialized")
            return None
        
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': settings.aws_s3_bucket, 'Key': s3_key},
                ExpiresIn=expiry_seconds
            )
            return url
        except ClientError as e:
            logger.error(f"Failed to generate presigned URL: {e}")
            return None
    
    def get_session_metadata(self, s3_key: str) -> Optional[Dict[str, Any]]:
        """
        Get metadata for a specific session recording.
        
        Args:
            s3_key: S3 key of the recording
        
        Returns:
            Metadata dict or None if failed
        """
        if not self.s3_client:
            logger.warning("S3 client not initialized")
            return None
        
        try:
            response = self.s3_client.head_object(
                Bucket=settings.aws_s3_bucket,
                Key=s3_key
            )
            
            return {
                'size': response['ContentLength'],
                'content_type': response.get('ContentType'),
                'last_modified': response['LastModified'].isoformat(),
                'etag': response['ETag'].strip('"'),
                'metadata': response.get('Metadata', {})
            }
            
        except ClientError as e:
            logger.error(f"Failed to get session metadata: {e}")
            return None
    
    def delete_session_recording(self, s3_key: str) -> bool:
        """
        Delete a session recording from S3.
        
        Args:
            s3_key: S3 key of the recording
        
        Returns:
            True if deleted successfully, False otherwise
        """
        if not self.s3_client:
            logger.warning("S3 client not initialized")
            return False
        
        try:
            self.s3_client.delete_object(
                Bucket=settings.aws_s3_bucket,
                Key=s3_key
            )
            logger.info(f"Session recording deleted from S3: {s3_key}")
            return True
        except ClientError as e:
            logger.error(f"Failed to delete from S3: {e}")
            return False
    
    def generate_upload_url(self, coach_id: str, client_id: str, session_date: datetime, 
                          filename: str, expiry_seconds: int = 3600) -> Optional[Dict[str, Any]]:
        """
        Generate a presigned POST URL for direct browser upload.
        
        Args:
            coach_id: ID of the coach
            client_id: ID of the client
            session_date: Date of the session
            filename: Name of the file to upload
            expiry_seconds: URL expiry time in seconds
        
        Returns:
            Dict with upload URL and fields for form POST
        """
        if not self.s3_client:
            logger.warning("S3 client not initialized")
            return None
        
        try:
            s3_key = self.generate_s3_key(coach_id, client_id, session_date, filename)
            
            # Generate presigned POST URL
            response = self.s3_client.generate_presigned_post(
                Bucket=settings.aws_s3_bucket,
                Key=s3_key,
                Fields={
                    'Content-Type': 'video/mp4',
                    'x-amz-meta-coach_id': coach_id,
                    'x-amz-meta-client_id': client_id,
                    'x-amz-meta-session_date': session_date.isoformat()
                },
                Conditions=[
                    {'Content-Type': 'video/mp4'},
                    ['content-length-range', 0, 5368709120]  # Max 5GB
                ],
                ExpiresIn=expiry_seconds
            )
            
            return {
                'url': response['url'],
                'fields': response['fields'],
                's3_key': s3_key
            }
            
        except ClientError as e:
            logger.error(f"Failed to generate upload URL: {e}")
            return None