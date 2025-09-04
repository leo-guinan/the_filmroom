import os
import json
import boto3
import requests
from typing import Dict, Any, Optional
from datetime import datetime
from botocore.exceptions import ClientError
from src.core import settings, get_logger

logger = get_logger(__name__)


class RecordingService:
    """Service for managing session recordings with LiveKit and S3."""
    
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
            logger.warning("AWS credentials not configured, S3 uploads will be disabled")
    
    @staticmethod
    def start_recording(room_name: str) -> Optional[Dict[str, Any]]:
        """Start recording a LiveKit room."""
        try:
            # LiveKit Egress API to start recording
            egress_url = settings.livekit_url.replace("ws://", "http://").replace("wss://", "https://")
            egress_url = f"{egress_url}/twirp/livekit.Egress/StartRoomCompositeEgress"
            
            # Configure S3 upload destination if available
            if settings.aws_access_key_id and settings.aws_secret_access_key:
                file_outputs = [{
                    "s3": {
                        "access_key": settings.aws_access_key_id,
                        "secret": settings.aws_secret_access_key,
                        "region": settings.aws_region,
                        "bucket": settings.aws_s3_bucket,
                        "filepath": f"recordings/{room_name}/{datetime.now().strftime('%Y%m%d_%H%M%S')}.mp4"
                    }
                }]
            else:
                # Use local file output as fallback
                file_outputs = [{
                    "filepath": f"/tmp/recordings/{room_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.mp4"
                }]
            
            payload = {
                "room_name": room_name,
                "layout": "speaker",  # Focus on active speaker
                "audio_only": False,
                "video_only": False,
                "file_outputs": file_outputs,
                "preset": "HD_30"  # HD quality at 30fps
            }
            
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {settings.livekit_api_key}"
            }
            
            response = requests.post(egress_url, json=payload, headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                logger.info(f"Recording started for room {room_name}: {result.get('egress_id')}")
                return result
            else:
                logger.error(f"Failed to start recording: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"Error starting recording for room {room_name}: {e}")
            return None
    
    @staticmethod
    def stop_recording(egress_id: str) -> bool:
        """Stop an ongoing recording."""
        try:
            egress_url = settings.livekit_url.replace("ws://", "http://").replace("wss://", "https://")
            egress_url = f"{egress_url}/twirp/livekit.Egress/StopEgress"
            
            payload = {"egress_id": egress_id}
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {settings.livekit_api_key}"
            }
            
            response = requests.post(egress_url, json=payload, headers=headers)
            
            if response.status_code == 200:
                logger.info(f"Recording stopped: {egress_id}")
                return True
            else:
                logger.error(f"Failed to stop recording: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Error stopping recording {egress_id}: {e}")
            return False
    
    def upload_to_s3(self, file_path: str, s3_key: str) -> Optional[str]:
        """Upload a file to S3 and return the URL."""
        if not self.s3_client:
            logger.warning("S3 client not initialized, cannot upload")
            return None
        
        try:
            # Upload file
            self.s3_client.upload_file(
                file_path,
                settings.aws_s3_bucket,
                s3_key,
                ExtraArgs={'ContentType': 'video/mp4'}
            )
            
            # Generate presigned URL (valid for 7 days)
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': settings.aws_s3_bucket, 'Key': s3_key},
                ExpiresIn=604800  # 7 days
            )
            
            logger.info(f"File uploaded to S3: {s3_key}")
            return url
            
        except ClientError as e:
            logger.error(f"Failed to upload to S3: {e}")
            return None
    
    def get_recording_url(self, s3_key: str, expiry_seconds: int = 3600) -> Optional[str]:
        """Generate a presigned URL for accessing a recording."""
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
    
    def delete_recording(self, s3_key: str) -> bool:
        """Delete a recording from S3."""
        if not self.s3_client:
            logger.warning("S3 client not initialized")
            return False
        
        try:
            self.s3_client.delete_object(
                Bucket=settings.aws_s3_bucket,
                Key=s3_key
            )
            logger.info(f"Recording deleted from S3: {s3_key}")
            return True
        except ClientError as e:
            logger.error(f"Failed to delete from S3: {e}")
            return False
    
    @staticmethod
    def handle_webhook(payload: Dict[str, Any]) -> Dict[str, Any]:
        """Handle LiveKit webhook for recording events."""
        event = payload.get("event")
        
        if event == "egress_started":
            egress_id = payload.get("egress", {}).get("egress_id")
            room_name = payload.get("egress", {}).get("room_name")
            logger.info(f"Recording started webhook: {egress_id} for room {room_name}")
            return {"status": "started", "egress_id": egress_id}
        
        elif event == "egress_ended":
            egress_id = payload.get("egress", {}).get("egress_id")
            room_name = payload.get("egress", {}).get("room_name")
            file_info = payload.get("file", {})
            
            logger.info(f"Recording ended webhook: {egress_id} for room {room_name}")
            
            # If using S3, the file is already uploaded
            if file_info.get("location", "").startswith("s3://"):
                s3_path = file_info.get("location").replace("s3://", "")
                bucket, key = s3_path.split("/", 1)
                return {
                    "status": "completed",
                    "egress_id": egress_id,
                    "s3_bucket": bucket,
                    "s3_key": key,
                    "duration": file_info.get("duration"),
                    "size": file_info.get("size")
                }
            
            return {"status": "completed", "egress_id": egress_id}
        
        else:
            logger.warning(f"Unknown webhook event: {event}")
            return {"status": "unknown", "event": event}