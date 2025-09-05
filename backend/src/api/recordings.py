from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime
import json

from src.models import get_db
from src.services.auth import get_current_user
from src.models.user import User
from src.models.session import Session as SessionModel, SessionUpload
from src.services.s3 import s3_service
from src.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api/v1/recordings", tags=["recordings"])


@router.get("/sessions")
async def get_coach_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    include_transcript: bool = Query(False, description="Include transcript data"),
    include_analysis: bool = Query(False, description="Include analysis data")
) -> List[Dict[str, Any]]:
    """Get all sessions for a coach with their recording status."""
    try:
        # Get all sessions where user is a coach
        sessions = db.query(SessionModel).filter(
            SessionModel.coach_id == current_user.id
        ).order_by(SessionModel.scheduled_at.desc()).all()
        
        result = []
        for session in sessions:
            session_data = {
                "id": session.id,
                "title": session.title,
                "description": session.description,
                "scheduled_at": session.scheduled_at.isoformat(),
                "duration_minutes": session.duration_minutes,
                "status": session.status,
                "client": {
                    "id": session.client.id,
                    "name": session.client.name,
                    "email": session.client.email
                } if session.client else None,
                "participants": session.participants or [],
                "recording": {
                    "has_recording": bool(session.recording_url or session.s3_upload_key),
                    "recording_url": session.recording_url,
                    "s3_key": session.s3_upload_key,
                    "s3_status": session.s3_upload_status,
                    "external_platform": session.external_platform,
                    "external_url": session.external_recording_url,
                    "size_bytes": session.recording_size_bytes,
                    "duration_seconds": session.recording_duration_seconds
                },
                "transcript_status": session.transcript_status,
                "analysis_status": session.analysis_status,
                "uploads": [
                    {
                        "id": upload.id,
                        "type": upload.upload_type,
                        "s3_key": upload.s3_key,
                        "status": upload.upload_status,
                        "size_bytes": upload.file_size_bytes,
                        "created_at": upload.created_at.isoformat()
                    } for upload in session.uploads
                ]
            }
            
            if include_transcript and session.transcript:
                session_data["transcript"] = session.transcript
            
            if include_analysis and session.analysis:
                session_data["analysis"] = session.analysis
            
            result.append(session_data)
        
        return result
    
    except Exception as e:
        logger.error(f"Failed to get coach sessions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload")
async def upload_recording(
    background_tasks: BackgroundTasks,
    session_id: str = Form(...),
    platform: Optional[str] = Form(None, description="External platform (zoom, teams, etc)"),
    external_url: Optional[str] = Form(None, description="External recording URL"),
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Upload a recording for a session."""
    try:
        # Verify session exists and user is the coach
        session = db.query(SessionModel).filter(
            SessionModel.id == session_id,
            SessionModel.coach_id == current_user.id
        ).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Generate S3 key
        if file:
            filename = file.filename
        elif external_url:
            from urllib.parse import urlparse
            filename = urlparse(external_url).path.split('/')[-1] or "recording"
        else:
            raise HTTPException(status_code=400, detail="Either file or external_url must be provided")
        
        s3_key = s3_service.generate_session_key(
            coach_id=session.coach_id,
            client_id=session.client_id,
            session_date=session.scheduled_at,
            filename=filename
        )
        
        # Create upload record
        upload_record = SessionUpload(
            session_id=session_id,
            upload_type='manual' if file else 'external',
            original_url=external_url,
            s3_key=s3_key,
            upload_status='uploading',
            uploaded_by_user_id=current_user.id
        )
        db.add(upload_record)
        
        # Update session
        session.external_platform = platform
        session.external_recording_url = external_url
        session.s3_upload_key = s3_key
        session.s3_upload_status = 'uploading'
        
        db.commit()
        
        # Handle upload based on source
        if file:
            # Direct file upload
            result = s3_service.upload_file(file.file, s3_key, file.content_type)
            
            if result['success']:
                upload_record.upload_status = 'completed'
                upload_record.file_size_bytes = result.get('size_bytes', 0)
                upload_record.mime_type = result.get('content_type', '')
                
                session.s3_upload_status = 'completed'
                session.s3_upload_completed_at = datetime.utcnow()
                session.recording_size_bytes = result.get('size_bytes', 0)
            else:
                upload_record.upload_status = 'failed'
                upload_record.error_message = result.get('error', 'Unknown error')
                session.s3_upload_status = 'failed'
        
        elif external_url:
            # Schedule background download from URL
            background_tasks.add_task(
                download_and_upload_recording,
                upload_record_id=upload_record.id,
                session_id=session_id,
                external_url=external_url,
                s3_key=s3_key
            )
            
            result = {
                'success': True,
                'message': 'Upload scheduled',
                's3_key': s3_key,
                'status': 'uploading'
            }
        
        db.commit()
        
        return {
            "upload_id": upload_record.id,
            "session_id": session_id,
            "s3_key": s3_key,
            "status": upload_record.upload_status,
            "message": result.get('message', 'Upload initiated')
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to upload recording: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/presigned-upload-url")
async def get_presigned_upload_url(
    session_id: str = Query(..., description="Session ID"),
    filename: str = Query(..., description="Filename for the upload"),
    content_type: Optional[str] = Query(None, description="Content type of the file"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get a presigned URL for direct upload to S3."""
    try:
        # Verify session exists and user is the coach
        session = db.query(SessionModel).filter(
            SessionModel.id == session_id,
            SessionModel.coach_id == current_user.id
        ).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Generate S3 key
        s3_key = s3_service.generate_session_key(
            coach_id=session.coach_id,
            client_id=session.client_id,
            session_date=session.scheduled_at,
            filename=filename
        )
        
        # Generate presigned URL
        result = s3_service.generate_upload_presigned_url(s3_key, content_type)
        
        if not result:
            raise HTTPException(status_code=500, detail="Failed to generate upload URL")
        
        # Create upload record in pending state
        upload_record = SessionUpload(
            session_id=session_id,
            upload_type='manual',
            s3_key=s3_key,
            upload_status='pending',
            uploaded_by_user_id=current_user.id,
            mime_type=content_type
        )
        db.add(upload_record)
        
        # Update session
        session.s3_upload_key = s3_key
        session.s3_upload_status = 'pending'
        
        db.commit()
        
        return {
            "upload_id": upload_record.id,
            "upload_url": result['url'],
            "fields": result['fields'],
            "s3_key": s3_key,
            "expires_in": result['expires_in']
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to generate presigned URL: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/confirm-upload/{upload_id}")
async def confirm_upload(
    upload_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Confirm that a direct S3 upload has completed."""
    try:
        # Get upload record
        upload = db.query(SessionUpload).filter(
            SessionUpload.id == upload_id,
            SessionUpload.uploaded_by_user_id == current_user.id
        ).first()
        
        if not upload:
            raise HTTPException(status_code=404, detail="Upload record not found")
        
        # Verify file exists in S3
        metadata = s3_service.get_file_metadata(upload.s3_key)
        
        if metadata:
            upload.upload_status = 'completed'
            upload.file_size_bytes = metadata['size_bytes']
            upload.updated_at = datetime.utcnow()
            
            # Update session
            session = upload.session
            session.s3_upload_status = 'completed'
            session.s3_upload_completed_at = datetime.utcnow()
            session.recording_size_bytes = metadata['size_bytes']
            
            db.commit()
            
            return {
                "upload_id": upload_id,
                "status": "completed",
                "s3_key": upload.s3_key,
                "size_bytes": metadata['size_bytes']
            }
        else:
            return {
                "upload_id": upload_id,
                "status": "not_found",
                "message": "File not found in S3"
            }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to confirm upload: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sync-bucket")
async def sync_bucket_with_database(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Sync S3 bucket contents with database records (admin only)."""
    # For now, allow any authenticated coach to sync their recordings
    # In production, this should be restricted to admins
    
    try:
        stats = s3_service.sync_bucket_to_database()
        return stats
    
    except Exception as e:
        logger.error(f"Failed to sync bucket: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/download/{session_id}")
async def get_recording_download_url(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get a presigned URL for downloading a recording."""
    try:
        # Verify session exists and user is the coach
        session = db.query(SessionModel).filter(
            SessionModel.id == session_id,
            SessionModel.coach_id == current_user.id
        ).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        if not session.s3_upload_key:
            raise HTTPException(status_code=404, detail="No recording found for this session")
        
        # Generate presigned URL
        url = s3_service.generate_presigned_url(session.s3_upload_key, expiration=3600)
        
        if not url:
            raise HTTPException(status_code=500, detail="Failed to generate download URL")
        
        return {
            "session_id": session_id,
            "download_url": url,
            "expires_in": 3600,
            "filename": session.s3_upload_key.split('/')[-1]
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get download URL: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/recording/{session_id}")
async def delete_recording(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Delete a recording from S3 and database."""
    try:
        # Verify session exists and user is the coach
        session = db.query(SessionModel).filter(
            SessionModel.id == session_id,
            SessionModel.coach_id == current_user.id
        ).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Delete from S3 if exists
        if session.s3_upload_key:
            s3_service.delete_file(session.s3_upload_key)
        
        # Clear session recording fields
        session.recording_url = None
        session.recording_s3_key = None
        session.s3_upload_key = None
        session.s3_upload_status = None
        session.s3_upload_completed_at = None
        session.external_platform = None
        session.external_recording_url = None
        session.recording_size_bytes = None
        session.recording_duration_seconds = None
        session.transcript = None
        session.transcript_status = 'pending'
        session.analysis = None
        session.analysis_status = 'pending'
        
        # Delete upload records
        db.query(SessionUpload).filter(
            SessionUpload.session_id == session_id
        ).delete()
        
        db.commit()
        
        return {
            "session_id": session_id,
            "message": "Recording deleted successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete recording: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# Background task for downloading external recordings
async def download_and_upload_recording(
    upload_record_id: str,
    session_id: str,
    external_url: str,
    s3_key: str
):
    """Background task to download and upload recording to S3."""
    from src.models.base import SessionLocal
    
    db = SessionLocal()
    try:
        upload = db.query(SessionUpload).filter(SessionUpload.id == upload_record_id).first()
        session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
        
        if upload and session:
            # Download and upload to S3
            result = s3_service.upload_from_url(external_url, s3_key)
            
            if result['success']:
                upload.upload_status = 'completed'
                upload.file_size_bytes = result.get('size_bytes', 0)
                upload.mime_type = result.get('content_type', '')
                
                session.s3_upload_status = 'completed'
                session.s3_upload_completed_at = datetime.utcnow()
                session.recording_size_bytes = result.get('size_bytes', 0)
            else:
                upload.upload_status = 'failed'
                upload.error_message = result.get('error', 'Unknown error')
                session.s3_upload_status = 'failed'
            
            db.commit()
    
    except Exception as e:
        logger.error(f"Background upload failed: {e}")
        if upload:
            upload.upload_status = 'failed'
            upload.error_message = str(e)
            db.commit()
    finally:
        db.close()