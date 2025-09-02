from fastapi import APIRouter, HTTPException, Depends, Query, status
from sqlalchemy.orm import Session as DBSession
from sqlalchemy import or_, and_
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel, Field

from src.core import get_logger
from src.models import get_db, User
from src.models.session import Session, SessionStatus
from src.models.user import UserRole
from src.services.auth import get_current_active_user
from src.services.livekit import LiveKitService

router = APIRouter()
logger = get_logger(__name__)


class CreateSessionRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    client_id: str
    scheduled_at: datetime
    duration_minutes: int = Field(default=60, ge=15, le=240)


class UpdateSessionRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    duration_minutes: Optional[int] = Field(None, ge=15, le=240)
    status: Optional[SessionStatus] = None


class SessionResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    scheduled_at: datetime
    duration_minutes: int
    status: SessionStatus
    coach_id: str
    coach_name: str
    client_id: str
    client_name: str
    room_name: Optional[str]
    started_at: Optional[datetime]
    ended_at: Optional[datetime]
    actual_duration_minutes: Optional[int]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SessionListResponse(BaseModel):
    sessions: List[SessionResponse]
    total: int
    page: int
    per_page: int


class SessionJoinResponse(BaseModel):
    session_id: str
    room_name: str
    token: str
    url: str


@router.post("/", response_model=SessionResponse)
async def create_session(
    request: CreateSessionRequest,
    current_user: User = Depends(get_current_active_user),
    db: DBSession = Depends(get_db)
):
    """Create a new coaching session."""
    
    # Only coaches can create sessions
    if current_user.role != UserRole.COACH:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only coaches can create sessions"
        )
    
    # Verify client exists and is actually a client
    client = db.query(User).filter(
        User.id == request.client_id,
        User.role == UserRole.CLIENT
    ).first()
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    # Generate unique room name for LiveKit
    room_name = f"session_{current_user.id}_{request.client_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
    
    # Create session
    session = Session(
        title=request.title,
        description=request.description,
        scheduled_at=request.scheduled_at,
        duration_minutes=request.duration_minutes,
        coach_id=current_user.id,
        client_id=request.client_id,
        room_name=room_name,
        status=SessionStatus.SCHEDULED
    )
    
    db.add(session)
    db.commit()
    db.refresh(session)
    
    logger.info(f"Session created: {session.id} by coach {current_user.email}")
    
    return SessionResponse(
        id=session.id,
        title=session.title,
        description=session.description,
        scheduled_at=session.scheduled_at,
        duration_minutes=session.duration_minutes,
        status=session.status,
        coach_id=session.coach_id,
        coach_name=session.coach.full_name,
        client_id=session.client_id,
        client_name=session.client.full_name,
        room_name=session.room_name,
        started_at=session.started_at,
        ended_at=session.ended_at,
        actual_duration_minutes=session.actual_duration_minutes,
        created_at=session.created_at,
        updated_at=session.updated_at
    )


@router.get("/", response_model=SessionListResponse)
async def list_sessions(
    status_filter: Optional[SessionStatus] = None,
    upcoming_only: bool = False,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: DBSession = Depends(get_db)
):
    """List sessions for the current user (as coach or client)."""
    
    # Base query - user can see sessions where they are coach or client
    query = db.query(Session).filter(
        or_(
            Session.coach_id == current_user.id,
            Session.client_id == current_user.id
        )
    )
    
    # Apply filters
    if status_filter:
        query = query.filter(Session.status == status_filter)
    
    if upcoming_only:
        query = query.filter(
            Session.scheduled_at >= datetime.utcnow(),
            Session.status == SessionStatus.SCHEDULED
        )
    
    # Order by scheduled time (upcoming first)
    query = query.order_by(Session.scheduled_at.desc())
    
    # Pagination
    total = query.count()
    offset = (page - 1) * per_page
    sessions = query.offset(offset).limit(per_page).all()
    
    # Format response
    session_responses = []
    for session in sessions:
        session_responses.append(SessionResponse(
            id=session.id,
            title=session.title,
            description=session.description,
            scheduled_at=session.scheduled_at,
            duration_minutes=session.duration_minutes,
            status=session.status,
            coach_id=session.coach_id,
            coach_name=session.coach.full_name,
            client_id=session.client_id,
            client_name=session.client.full_name,
            room_name=session.room_name,
            started_at=session.started_at,
            ended_at=session.ended_at,
            actual_duration_minutes=session.actual_duration_minutes,
            created_at=session.created_at,
            updated_at=session.updated_at
        ))
    
    return SessionListResponse(
        sessions=session_responses,
        total=total,
        page=page,
        per_page=per_page
    )


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: str,
    current_user: User = Depends(get_current_active_user),
    db: DBSession = Depends(get_db)
):
    """Get a specific session by ID."""
    
    session = db.query(Session).filter(
        Session.id == session_id,
        or_(
            Session.coach_id == current_user.id,
            Session.client_id == current_user.id
        )
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    return SessionResponse(
        id=session.id,
        title=session.title,
        description=session.description,
        scheduled_at=session.scheduled_at,
        duration_minutes=session.duration_minutes,
        status=session.status,
        coach_id=session.coach_id,
        coach_name=session.coach.full_name,
        client_id=session.client_id,
        client_name=session.client.full_name,
        room_name=session.room_name,
        started_at=session.started_at,
        ended_at=session.ended_at,
        actual_duration_minutes=session.actual_duration_minutes,
        created_at=session.created_at,
        updated_at=session.updated_at
    )


@router.post("/{session_id}/join", response_model=SessionJoinResponse)
async def join_session(
    session_id: str,
    current_user: User = Depends(get_current_active_user),
    db: DBSession = Depends(get_db)
):
    """Join a video session and get LiveKit token."""
    
    # Get session and verify access
    session = db.query(Session).filter(
        Session.id == session_id,
        or_(
            Session.coach_id == current_user.id,
            Session.client_id == current_user.id
        )
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Determine user role in session
    is_coach = session.coach_id == current_user.id
    
    # Generate metadata for the participant
    metadata = {
        "user_id": str(current_user.id),
        "user_role": "coach" if is_coach else "client",
        "session_id": session_id
    }
    
    # Generate LiveKit token
    token = LiveKitService.generate_token(
        room_name=session.room_name,
        participant_name=current_user.full_name,
        participant_identity=str(current_user.id),
        metadata=metadata,
        can_publish=True,
        can_subscribe=True,
        can_publish_data=True
    )
    
    # Get LiveKit URL
    from src.core import settings
    livekit_url = settings.livekit_url.replace("ws://", "").replace("wss://", "")
    
    # If session is scheduled, start it
    if session.status == SessionStatus.SCHEDULED:
        session.status = SessionStatus.IN_PROGRESS
        session.started_at = datetime.utcnow()
        db.commit()
        logger.info(f"Session {session_id} started by {current_user.email}")
    
    return SessionJoinResponse(
        session_id=session_id,
        room_name=session.room_name,
        token=token,
        url=livekit_url
    )


@router.patch("/{session_id}", response_model=SessionResponse)
async def update_session(
    session_id: str,
    request: UpdateSessionRequest,
    current_user: User = Depends(get_current_active_user),
    db: DBSession = Depends(get_db)
):
    """Update a session (coach only)."""
    
    session = db.query(Session).filter(
        Session.id == session_id,
        Session.coach_id == current_user.id  # Only coach can update
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or you don't have permission to update it"
        )
    
    # Update fields if provided
    if request.title is not None:
        session.title = request.title
    if request.description is not None:
        session.description = request.description
    if request.scheduled_at is not None:
        session.scheduled_at = request.scheduled_at
    if request.duration_minutes is not None:
        session.duration_minutes = request.duration_minutes
    if request.status is not None:
        session.status = request.status
        
        # Update timing fields based on status
        if request.status == SessionStatus.IN_PROGRESS and not session.started_at:
            session.started_at = datetime.utcnow()
        elif request.status == SessionStatus.COMPLETED and not session.ended_at:
            session.ended_at = datetime.utcnow()
            if session.started_at:
                delta = session.ended_at - session.started_at
                session.actual_duration_minutes = int(delta.total_seconds() / 60)
    
    session.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(session)
    
    logger.info(f"Session {session_id} updated by {current_user.email}")
    
    return SessionResponse(
        id=session.id,
        title=session.title,
        description=session.description,
        scheduled_at=session.scheduled_at,
        duration_minutes=session.duration_minutes,
        status=session.status,
        coach_id=session.coach_id,
        coach_name=session.coach.full_name,
        client_id=session.client_id,
        client_name=session.client.full_name,
        room_name=session.room_name,
        started_at=session.started_at,
        ended_at=session.ended_at,
        actual_duration_minutes=session.actual_duration_minutes,
        created_at=session.created_at,
        updated_at=session.updated_at
    )


@router.post("/{session_id}/end", response_model=SessionResponse)
async def end_session(
    session_id: str,
    current_user: User = Depends(get_current_active_user),
    db: DBSession = Depends(get_db)
):
    """End a session (mark as completed)."""
    
    session = db.query(Session).filter(
        Session.id == session_id,
        or_(
            Session.coach_id == current_user.id,
            Session.client_id == current_user.id
        )
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    if session.status != SessionStatus.IN_PROGRESS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot end session in {session.status} status"
        )
    
    session.status = SessionStatus.COMPLETED
    session.ended_at = datetime.utcnow()
    
    if session.started_at:
        delta = session.ended_at - session.started_at
        session.actual_duration_minutes = int(delta.total_seconds() / 60)
    
    session.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(session)
    
    logger.info(f"Session {session_id} ended by {current_user.email}")
    
    return SessionResponse(
        id=session.id,
        title=session.title,
        description=session.description,
        scheduled_at=session.scheduled_at,
        duration_minutes=session.duration_minutes,
        status=session.status,
        coach_id=session.coach_id,
        coach_name=session.coach.full_name,
        client_id=session.client_id,
        client_name=session.client.full_name,
        room_name=session.room_name,
        started_at=session.started_at,
        ended_at=session.ended_at,
        actual_duration_minutes=session.actual_duration_minutes,
        created_at=session.created_at,
        updated_at=session.updated_at
    )


@router.delete("/{session_id}")
async def delete_session(
    session_id: str,
    current_user: User = Depends(get_current_active_user),
    db: DBSession = Depends(get_db)
):
    """Delete a session (coach only, and only if scheduled)."""
    
    session = db.query(Session).filter(
        Session.id == session_id,
        Session.coach_id == current_user.id  # Only coach can delete
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or you don't have permission to delete it"
        )
    
    if session.status != SessionStatus.SCHEDULED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only delete scheduled sessions"
        )
    
    db.delete(session)
    db.commit()
    
    logger.info(f"Session {session_id} deleted by {current_user.email}")
    
    return {"message": "Session deleted successfully"}