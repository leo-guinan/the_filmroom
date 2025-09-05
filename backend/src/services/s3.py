import boto3
from botocore.exceptions import NoCredentialsError, ClientError
from typing import Optional, Dict, List, Any, BinaryIO
import os
import mimetypes
from datetime import datetime, timedelta
import uuid
from urllib.parse import urlparse

from src.core.config import settings
from src.core.logging import get_logger

logger = get_logger(__name__)


class S3Service:
    def __init__(self):
        self.bucket_name = settings.aws_s3_bucket
        self.region = settings.aws_region
        
        if settings.aws_access_key_id and settings.aws_secret_access_key:
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=settings.aws_access_key_id,
                aws_secret_access_key=settings.aws_secret_access_key,
                region_name=self.region
            )
        else:
            # Use default credentials (IAM role, etc.)
            self.s3_client = boto3.client('s3', region_name=self.region)
    
    def generate_session_key(self, coach_id: str, client_id: str, session_date: datetime, filename: str) -> str:
        """Generate a standardized S3 key for a session recording."""
        date_str = session_date.strftime("%Y-%m-%d")
        file_ext = os.path.splitext(filename)[1]
        unique_id = str(uuid.uuid4())[:8]
        
        # Format: recordings/{coach_id}/{client_id}/{date}/{filename}_{unique_id}
        key = f"recordings/{coach_id}/{client_id}/{date_str}/{os.path.splitext(filename)[0]}_{unique_id}{file_ext}"
        return key
    
    def upload_file(self, file_obj: BinaryIO, s3_key: str, content_type: Optional[str] = None) -> Dict[str, Any]:
        """Upload a file to S3."""
        try:
            if not content_type:
                content_type, _ = mimetypes.guess_type(s3_key)
                if not content_type:
                    content_type = 'application/octet-stream'
            
            extra_args = {
                'ContentType': content_type,
                'ServerSideEncryption': 'AES256',
                'Metadata': {
                    'uploaded_at': datetime.utcnow().isoformat(),
                    'source': 'filmroom'
                }
            }
            
            self.s3_client.upload_fileobj(file_obj, self.bucket_name, s3_key, ExtraArgs=extra_args)
            
            # Get file info
            response = self.s3_client.head_object(Bucket=self.bucket_name, Key=s3_key)
            
            return {
                'success': True,
                's3_key': s3_key,
                'bucket': self.bucket_name,
                'size_bytes': response.get('ContentLength', 0),
                'content_type': response.get('ContentType', content_type),
                'etag': response.get('ETag', '').strip('"'),
                'url': self.generate_presigned_url(s3_key, expiration=3600)
            }
        except ClientError as e:
            logger.error(f"Failed to upload file to S3: {e}")
            return {
                'success': False,
                'error': str(e)
            }
        except Exception as e:
            logger.error(f"Unexpected error uploading to S3: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def upload_from_url(self, url: str, s3_key: str) -> Dict[str, Any]:
        """Download a file from URL and upload to S3."""
        import requests
        
        try:
            # Download the file
            response = requests.get(url, stream=True, timeout=300)
            response.raise_for_status()
            
            content_type = response.headers.get('content-type', 'application/octet-stream')
            
            # Upload to S3
            result = self.upload_file(response.raw, s3_key, content_type)
            
            return result
        except requests.RequestException as e:
            logger.error(f"Failed to download file from URL: {e}")
            return {
                'success': False,
                'error': f"Failed to download file: {str(e)}"
            }
        except Exception as e:
            logger.error(f"Unexpected error in upload_from_url: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def generate_presigned_url(self, s3_key: str, expiration: int = 3600) -> Optional[str]:
        """Generate a presigned URL for accessing an S3 object."""
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': s3_key},
                ExpiresIn=expiration
            )
            return url
        except ClientError as e:
            logger.error(f"Failed to generate presigned URL: {e}")
            return None
    
    def generate_upload_presigned_url(self, s3_key: str, content_type: str = None, expiration: int = 3600) -> Dict[str, Any]:
        """Generate a presigned URL for uploading directly to S3."""
        try:
            fields = {}
            conditions = []
            
            if content_type:
                fields['Content-Type'] = content_type
                conditions.append({'Content-Type': content_type})
            
            response = self.s3_client.generate_presigned_post(
                Bucket=self.bucket_name,
                Key=s3_key,
                Fields=fields,
                Conditions=conditions,
                ExpiresIn=expiration
            )
            
            return {
                'url': response['url'],
                'fields': response['fields'],
                's3_key': s3_key,
                'expires_in': expiration
            }
        except ClientError as e:
            logger.error(f"Failed to generate upload presigned URL: {e}")
            return None
    
    def list_session_recordings(self, prefix: str = "recordings/") -> List[Dict[str, Any]]:
        """List all recordings in the bucket with optional prefix."""
        try:
            paginator = self.s3_client.get_paginator('list_objects_v2')
            pages = paginator.paginate(Bucket=self.bucket_name, Prefix=prefix)
            
            recordings = []
            for page in pages:
                if 'Contents' in page:
                    for obj in page['Contents']:
                        # Parse the key to extract metadata
                        key_parts = obj['Key'].split('/')
                        if len(key_parts) >= 4 and key_parts[0] == 'recordings':
                            recordings.append({
                                's3_key': obj['Key'],
                                'coach_id': key_parts[1],
                                'client_id': key_parts[2],
                                'date': key_parts[3],
                                'filename': key_parts[4] if len(key_parts) > 4 else '',
                                'size_bytes': obj['Size'],
                                'last_modified': obj['LastModified'].isoformat(),
                                'etag': obj['ETag'].strip('"')
                            })
            
            return recordings
        except ClientError as e:
            logger.error(f"Failed to list S3 objects: {e}")
            return []
    
    def delete_file(self, s3_key: str) -> bool:
        """Delete a file from S3."""
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=s3_key)
            return True
        except ClientError as e:
            logger.error(f"Failed to delete S3 object: {e}")
            return False
    
    def file_exists(self, s3_key: str) -> bool:
        """Check if a file exists in S3."""
        try:
            self.s3_client.head_object(Bucket=self.bucket_name, Key=s3_key)
            return True
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                return False
            logger.error(f"Error checking S3 object existence: {e}")
            return False
    
    def get_file_metadata(self, s3_key: str) -> Optional[Dict[str, Any]]:
        """Get metadata for an S3 object."""
        try:
            response = self.s3_client.head_object(Bucket=self.bucket_name, Key=s3_key)
            return {
                'size_bytes': response.get('ContentLength', 0),
                'content_type': response.get('ContentType', ''),
                'last_modified': response.get('LastModified').isoformat() if response.get('LastModified') else None,
                'etag': response.get('ETag', '').strip('"'),
                'metadata': response.get('Metadata', {})
            }
        except ClientError as e:
            if e.response['Error']['Code'] != '404':
                logger.error(f"Error getting S3 object metadata: {e}")
            return None
    
    def copy_file(self, source_key: str, dest_key: str) -> bool:
        """Copy a file within S3."""
        try:
            copy_source = {'Bucket': self.bucket_name, 'Key': source_key}
            self.s3_client.copy_object(
                CopySource=copy_source,
                Bucket=self.bucket_name,
                Key=dest_key,
                ServerSideEncryption='AES256'
            )
            return True
        except ClientError as e:
            logger.error(f"Failed to copy S3 object: {e}")
            return False
    
    def sync_bucket_to_database(self) -> Dict[str, Any]:
        """Sync S3 bucket contents with database records."""
        from src.models.session import Session, SessionUpload
        from src.models import get_db
        
        try:
            recordings = self.list_session_recordings()
            
            stats = {
                'total_files': len(recordings),
                'new_records': 0,
                'updated_records': 0,
                'errors': []
            }
            
            from src.models.base import SessionLocal
            db = SessionLocal()
            try:
                for recording in recordings:
                    try:
                        # Check if upload record exists
                        existing = db.query(SessionUpload).filter_by(s3_key=recording['s3_key']).first()
                        
                        if not existing:
                            # Try to find matching session
                            from sqlalchemy import func
                            session = db.query(Session).filter(
                                Session.coach_id == recording['coach_id'],
                                Session.client_id == recording['client_id'],
                                func.date(Session.scheduled_at) == datetime.fromisoformat(recording['date']).date()
                            ).first()
                            
                            if session:
                                # Create new upload record
                                upload = SessionUpload(
                                    session_id=session.id,
                                    upload_type='external',
                                    s3_key=recording['s3_key'],
                                    file_size_bytes=recording['size_bytes'],
                                    upload_status='completed'
                                )
                                db.add(upload)
                                
                                # Update session if needed
                                if not session.s3_upload_key:
                                    session.s3_upload_key = recording['s3_key']
                                    session.s3_upload_status = 'completed'
                                    session.s3_upload_completed_at = datetime.utcnow()
                                
                                stats['new_records'] += 1
                            else:
                                stats['errors'].append(f"No matching session for {recording['s3_key']}")
                        else:
                            # Update existing record if needed
                            if existing.file_size_bytes != recording['size_bytes']:
                                existing.file_size_bytes = recording['size_bytes']
                                existing.updated_at = datetime.utcnow()
                                stats['updated_records'] += 1
                    
                    except Exception as e:
                        stats['errors'].append(f"Error processing {recording['s3_key']}: {str(e)}")
                
                db.commit()
                
                return stats
            finally:
                db.close()
        
        except Exception as e:
            logger.error(f"Failed to sync bucket to database: {e}")
            return {
                'error': str(e),
                'total_files': 0,
                'new_records': 0,
                'updated_records': 0
            }


# Singleton instance
s3_service = S3Service()