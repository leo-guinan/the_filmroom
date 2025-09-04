from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, status
from sqlalchemy.orm import Session as DBSession
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field
import os

from src.core import get_logger
from src.models import get_db, User
from src.models.session import Session, SessionStatus
from src.models.user import UserRole
from src.services.auth import get_current_active_user
from src.services.session_storage import SessionStorageService

router = APIRouter()
logger = get_logger(__name__)


class S3SessionResponse(BaseModel):
    """Response model for S3 stored sessions."""
    key: str
    coach_id: str
    client_id: str
    date: str
    filename: str
    size: int
    last_modified: str
    url: Optional[str] = None
    session_id: Optional[str] = None
    client_name: Optional[str] = None


class S3SessionListResponse(BaseModel):
    """Response model for list of S3 sessions."""
    sessions: List[S3SessionResponse]
    total: int


class CreateSessionRecordRequest(BaseModel):
    """Request model for creating a session record from S3."""
    s3_key: str
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    client_id: str
    session_date: datetime
    duration_minutes: int = Field(default=60, ge=1, le=480)


class UploadUrlRequest(BaseModel):
    """Request model for generating upload URL."""
    client_id: str
    session_date: datetime
    filename: str


class UploadUrlResponse(BaseModel):
    """Response model for upload URL."""
    url: str
    fields: dict
    s3_key: str


@router.get("/s3-sessions", response_model=S3SessionListResponse)
async def list_s3_sessions(
    client_id: Optional[str] = None,
    include_urls: bool = False,
    current_user: User = Depends(get_current_active_user),
    db: DBSession = Depends(get_db)
):
    """
    List all S3 stored sessions for the current coach.
    
    Args:
        client_id: Optional filter by client ID
        include_urls: Whether to include presigned URLs
    """
    # Only coaches can list their sessions
    if current_user.role != UserRole.COACH:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only coaches can access this endpoint"
        )
    
    storage_service = SessionStorageService()
    
    # Get sessions from S3
    s3_sessions = storage_service.list_coach_sessions(
        coach_id=str(current_user.id),
        client_id=client_id
    )
    
    # Enhance with additional data
    enhanced_sessions = []
    for s3_session in s3_sessions:
        # Get client name from database
        client = db.query(User).filter(
            User.id == s3_session['client_id']
        ).first()
        
        # Check if there's an existing session record
        existing_session = db.query(Session).filter(
            Session.recording_s3_key == s3_session['key']
        ).first()
        
        session_response = S3SessionResponse(
            key=s3_session['key'],
            coach_id=s3_session['coach_id'],
            client_id=s3_session['client_id'],
            date=s3_session['date'],
            filename=s3_session['filename'],
            size=s3_session['size'],
            last_modified=s3_session['last_modified'],
            client_name=client.full_name if client else None,
            session_id=str(existing_session.id) if existing_session else None
        )
        
        # Add presigned URL if requested
        if include_urls:
            session_response.url = storage_service.get_session_url(
                s3_session['key'],
                expiry_seconds=3600
            )
        
        enhanced_sessions.append(session_response)
    
    return S3SessionListResponse(
        sessions=enhanced_sessions,
        total=len(enhanced_sessions)
    )


@router.get("/coach-clients")
async def list_coach_clients(
    current_user: User = Depends(get_current_active_user),
    db: DBSession = Depends(get_db)
):
    """
    List all unique clients for a coach based on S3 sessions.
    """
    # Only coaches can access this
    if current_user.role != UserRole.COACH:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only coaches can access this endpoint"
        )
    
    storage_service = SessionStorageService()
    
    # Get client IDs from S3
    client_ids = storage_service.list_coach_clients(str(current_user.id))
    
    # Get client details from database
    clients = []
    for client_id in client_ids:
        client = db.query(User).filter(User.id == client_id).first()
        if client:
            clients.append({
                'id': str(client.id),
                'name': client.full_name,
                'email': client.email
            })
    
    return {'clients': clients, 'total': len(clients)}


@router.post("/create-from-s3", response_model=dict)
async def create_session_from_s3(
    request: CreateSessionRecordRequest,
    current_user: User = Depends(get_current_active_user),
    db: DBSession = Depends(get_db)
):
    """
    Create a session record in the database from an S3 recording.
    """
    # Only coaches can create session records
    if current_user.role != UserRole.COACH:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only coaches can create session records"
        )
    
    # Verify the S3 key exists and belongs to the coach
    storage_service = SessionStorageService()
    metadata = storage_service.get_session_metadata(request.s3_key)
    
    if not metadata:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recording not found in S3"
        )
    
    # Verify the recording belongs to this coach
    if not request.s3_key.startswith(f"coaches/{current_user.id}/"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to create a record for this recording"
        )
    
    # Check if session record already exists
    existing_session = db.query(Session).filter(
        Session.recording_s3_key == request.s3_key
    ).first()
    
    if existing_session:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session record already exists for this recording"
        )
    
    # Verify client exists
    client = db.query(User).filter(
        User.id == request.client_id,
        User.role == UserRole.CLIENT
    ).first()
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    # Generate presigned URL
    recording_url = storage_service.get_session_url(
        request.s3_key,
        expiry_seconds=604800  # 7 days
    )
    
    # Create session record
    session = Session(
        title=request.title,
        description=request.description,
        scheduled_at=request.session_date,
        duration_minutes=request.duration_minutes,
        coach_id=current_user.id,
        client_id=request.client_id,
        status=SessionStatus.COMPLETED,
        started_at=request.session_date,
        ended_at=request.session_date,
        actual_duration_minutes=request.duration_minutes,
        recording_url=recording_url,
        recording_s3_key=request.s3_key,
        recording_status='completed',
        recording_size_bytes=metadata['size']
    )
    
    db.add(session)
    db.commit()
    db.refresh(session)
    
    logger.info(f"Session record created from S3: {session.id} for recording {request.s3_key}")
    
    return {
        'session_id': str(session.id),
        's3_key': request.s3_key,
        'message': 'Session record created successfully'
    }


@router.post("/upload", response_model=dict)
async def upload_session_recording(
    file: UploadFile = File(...),
    client_id: str = Form(...),
    session_date: datetime = Form(...),
    title: str = Form(...),
    description: Optional[str] = Form(None),
    duration_minutes: int = Form(60),
    current_user: User = Depends(get_current_active_user),
    db: DBSession = Depends(get_db)
):
    """
    Upload a session recording directly.
    """
    # Only coaches can upload
    if current_user.role != UserRole.COACH:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only coaches can upload session recordings"
        )
    
    # Verify client exists
    client = db.query(User).filter(
        User.id == client_id,
        User.role == UserRole.CLIENT
    ).first()
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    # Validate file type
    allowed_types = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska']
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed types: {', '.join(allowed_types)}"
        )
    
    # Save file temporarily
    import tempfile
    import shutil
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp_file:
        shutil.copyfileobj(file.file, tmp_file)
        tmp_file_path = tmp_file.name
    
    try:
        storage_service = SessionStorageService()
        
        # Upload to S3
        upload_result = storage_service.upload_session_recording(
            file_path=tmp_file_path,
            coach_id=str(current_user.id),
            client_id=client_id,
            session_date=session_date,
            filename=file.filename
        )
        
        if not upload_result:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to upload recording to S3"
            )
        
        # Create session record
        session = Session(
            title=title,
            description=description,
            scheduled_at=session_date,
            duration_minutes=duration_minutes,
            coach_id=current_user.id,
            client_id=client_id,
            status=SessionStatus.COMPLETED,
            started_at=session_date,
            ended_at=session_date,
            actual_duration_minutes=duration_minutes,
            recording_url=upload_result['url'],
            recording_s3_key=upload_result['s3_key'],
            recording_status='completed',
            recording_size_bytes=upload_result['size']
        )
        
        db.add(session)
        db.commit()
        db.refresh(session)
        
        logger.info(f"Session uploaded and record created: {session.id}")
        
        return {
            'session_id': str(session.id),
            's3_key': upload_result['s3_key'],
            'message': 'Session uploaded successfully'
        }
        
    finally:
        # Clean up temporary file
        if os.path.exists(tmp_file_path):
            os.unlink(tmp_file_path)


@router.post("/generate-upload-url", response_model=UploadUrlResponse)
async def generate_upload_url(
    request: UploadUrlRequest,
    current_user: User = Depends(get_current_active_user),
    db: DBSession = Depends(get_db)
):
    """
    Generate a presigned URL for direct browser upload.
    """
    # Only coaches can generate upload URLs
    if current_user.role != UserRole.COACH:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only coaches can generate upload URLs"
        )
    
    # Verify client exists
    client = db.query(User).filter(
        User.id == request.client_id,
        User.role == UserRole.CLIENT
    ).first()
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    storage_service = SessionStorageService()
    
    # Generate presigned POST URL
    upload_data = storage_service.generate_upload_url(
        coach_id=str(current_user.id),
        client_id=request.client_id,
        session_date=request.session_date,
        filename=request.filename,
        expiry_seconds=3600
    )
    
    if not upload_data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate upload URL"
        )
    
    return UploadUrlResponse(
        url=upload_data['url'],
        fields=upload_data['fields'],
        s3_key=upload_data['s3_key']
    )


@router.delete("/s3-recording/{s3_key:path}")
async def delete_s3_recording(
    s3_key: str,
    current_user: User = Depends(get_current_active_user),
    db: DBSession = Depends(get_db)
):
    """
    Delete an S3 recording and its associated session record if exists.
    """
    # Only coaches can delete recordings
    if current_user.role != UserRole.COACH:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only coaches can delete recordings"
        )
    
    # Verify the recording belongs to this coach
    if not s3_key.startswith(f"coaches/{current_user.id}/"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this recording"
        )
    
    storage_service = SessionStorageService()
    
    # Check if there's an associated session record
    session = db.query(Session).filter(
        Session.recording_s3_key == s3_key
    ).first()
    
    if session:
        # Delete the session record
        db.delete(session)
        db.commit()
        logger.info(f"Deleted session record: {session.id}")
    
    # Delete from S3
    if storage_service.delete_session_recording(s3_key):
        return {'message': 'Recording deleted successfully'}
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete recording from S3"
        )