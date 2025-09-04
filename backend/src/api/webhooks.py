from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from typing import Dict, Any
from datetime import datetime
import hmac
import hashlib
import base64
import os

from src.core import settings, get_logger
from src.models.base import get_db
from src.models import Session as SessionModel
from src.services.recording import RecordingService

logger = get_logger(__name__)
router = APIRouter()


def verify_livekit_webhook(request_body: bytes, signature: str) -> bool:
    """Verify LiveKit webhook signature."""
    if not settings.livekit_api_secret:
        logger.warning("LiveKit API secret not configured, skipping webhook verification")
        return True
    
    expected_signature = base64.b64encode(
        hmac.new(
            settings.livekit_api_secret.encode(),
            request_body,
            hashlib.sha256
        ).digest()
    ).decode()
    
    return hmac.compare_digest(signature, expected_signature)


@router.post("/livekit/recording")
async def handle_recording_webhook(
    request: Request,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Handle LiveKit recording webhook events."""
    try:
        # Get request body
        body = await request.body()
        payload = await request.json()
        
        # Verify webhook signature (if in production)
        if settings.is_production:
            signature = request.headers.get("Authorization", "").replace("Bearer ", "")
            if not verify_livekit_webhook(body, signature):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid webhook signature"
                )
        
        # Handle the recording event
        result = RecordingService.handle_webhook(payload)
        
        # Update session in database based on event
        event = payload.get("event")
        egress_id = payload.get("egress", {}).get("egress_id")
        room_name = payload.get("egress", {}).get("room_name")
        
        if room_name:
            session = db.query(SessionModel).filter(
                SessionModel.room_name == room_name
            ).first()
            
            if session:
                if event == "egress_started":
                    session.recording_status = "recording"
                    session.recording_started_at = datetime.utcnow()
                    session.recording_egress_id = egress_id
                    logger.info(f"Recording started for session {session.id}")
                
                elif event == "egress_ended":
                    session.recording_status = "completed"
                    session.recording_completed_at = datetime.utcnow()
                    
                    # Extract file information
                    file_info = payload.get("file", {})
                    if file_info:
                        session.recording_duration_seconds = file_info.get("duration")
                        session.recording_size_bytes = file_info.get("size")
                        
                        # If using S3, store the key
                        if "s3_key" in result:
                            session.recording_s3_key = result["s3_key"]
                            
                            # Generate a presigned URL
                            recording_service = RecordingService()
                            url = recording_service.get_recording_url(result["s3_key"], expiry_seconds=604800)  # 7 days
                            if url:
                                session.recording_url = url
                    
                    logger.info(f"Recording completed for session {session.id}")
                    
                    # Notify processor service to start processing
                    try:
                        import requests
                        processor_url = os.getenv("PROCESSOR_SERVICE_URL", "http://localhost:3001")
                        response = requests.post(
                            f"{processor_url}/webhooks/recording-completed",
                            json={
                                "sessionId": session.id,
                                "recordingS3Key": session.recording_s3_key,
                                "recordingUrl": session.recording_url,
                            },
                            timeout=5
                        )
                        if response.status_code == 200:
                            logger.info(f"Notified processor service for session {session.id}")
                        else:
                            logger.warning(f"Failed to notify processor service: {response.status_code}")
                    except Exception as e:
                        logger.error(f"Error notifying processor service: {e}")
                
                elif event == "egress_failed":
                    session.recording_status = "failed"
                    logger.error(f"Recording failed for session {session.id}")
                
                db.commit()
            else:
                logger.warning(f"Session not found for room {room_name}")
        
        return {"status": "success", "result": result}
        
    except Exception as e:
        logger.error(f"Error handling recording webhook: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process webhook"
        )


@router.post("/livekit/room")
async def handle_room_webhook(
    request: Request,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Handle LiveKit room events (participant joined/left, etc.)."""
    try:
        # Get request body
        body = await request.body()
        payload = await request.json()
        
        # Verify webhook signature (if in production)
        if settings.is_production:
            signature = request.headers.get("Authorization", "").replace("Bearer ", "")
            if not verify_livekit_webhook(body, signature):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid webhook signature"
                )
        
        event = payload.get("event")
        room = payload.get("room", {})
        participant = payload.get("participant", {})
        
        logger.info(f"Room webhook event: {event}, room: {room.get('name')}, participant: {participant.get('identity')}")
        
        # Handle room events
        if event == "room_started":
            room_name = room.get("name")
            if room_name:
                session = db.query(SessionModel).filter(
                    SessionModel.room_name == room_name
                ).first()
                
                if session:
                    session.room_sid = room.get("sid")
                    session.status = "IN_PROGRESS"
                    session.started_at = datetime.utcnow()
                    
                    # Automatically start recording when room starts
                    recording_result = RecordingService.start_recording(room_name)
                    if recording_result:
                        session.recording_egress_id = recording_result.get("egress_id")
                        session.recording_status = "pending"
                        logger.info(f"Recording initiated for session {session.id}")
                    
                    db.commit()
        
        elif event == "room_finished":
            room_name = room.get("name")
            if room_name:
                session = db.query(SessionModel).filter(
                    SessionModel.room_name == room_name
                ).first()
                
                if session:
                    session.status = "COMPLETED"
                    session.ended_at = datetime.utcnow()
                    
                    # Calculate actual duration
                    if session.started_at:
                        duration = (session.ended_at - session.started_at).total_seconds() / 60
                        session.actual_duration_minutes = int(duration)
                    
                    db.commit()
        
        return {"status": "success", "event": event}
        
    except Exception as e:
        logger.error(f"Error handling room webhook: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process webhook"
        )