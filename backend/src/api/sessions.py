from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
from sqlalchemy.orm import Session

from core import get_logger
from models import get_db, User
from services.auth import get_current_active_user

router = APIRouter()
logger = get_logger(__name__)


class SessionStatus(str, Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class SessionCreate(BaseModel):
    title: str
    description: Optional[str] = None
    scheduled_at: datetime
    duration_minutes: int = Field(default=60, ge=15, le=180)
    client_id: str
    coach_id: Optional[str] = None  # Will be set from token if not provided


class SessionResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    scheduled_at: datetime
    duration_minutes: int
    status: SessionStatus
    room_name: Optional[str] = None
    coach_id: str
    client_id: str
    created_at: datetime
    updated_at: datetime


class SessionJoinResponse(BaseModel):
    session_id: str
    room_name: str
    livekit_token: str
    livekit_url: str


class TranscriptionResponse(BaseModel):
    session_id: str
    transcription: str
    created_at: datetime
    processing_time_seconds: float


class SessionInsights(BaseModel):
    session_id: str
    summary: str
    key_topics: List[str]
    action_items: List[str]
    sentiment_analysis: Dict[str, Any]
    created_at: datetime


@router.post("/", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    session_data: SessionCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new coaching session."""
    # TODO: Implement session creation
    logger.info(
        "Creating session",
        title=session_data.title,
        client_id=session_data.client_id,
        scheduled_at=session_data.scheduled_at.isoformat(),
    )
    
    return {
        "id": "session_123",
        "title": session_data.title,
        "description": session_data.description,
        "scheduled_at": session_data.scheduled_at,
        "duration_minutes": session_data.duration_minutes,
        "status": SessionStatus.SCHEDULED,
        "room_name": None,
        "coach_id": session_data.coach_id or "coach_123",
        "client_id": session_data.client_id,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }


@router.get("/", response_model=List[SessionResponse])
async def list_sessions(
    status: Optional[SessionStatus] = None,
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List coaching sessions."""
    # TODO: Implement session listing
    return []


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get session details."""
    # TODO: Implement session retrieval
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Session not found"
    )


@router.post("/{session_id}/join", response_model=SessionJoinResponse)
async def join_session(
    session_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Join a video session and get LiveKit token."""
    # TODO: Implement LiveKit room creation and token generation
    logger.info("User joining session", session_id=session_id)
    
    return {
        "session_id": session_id,
        "room_name": f"session_{session_id}",
        "livekit_token": "dummy_livekit_token",
        "livekit_url": "ws://localhost:7880",
    }


@router.post("/{session_id}/end", response_model=SessionResponse)
async def end_session(
    session_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """End a video session."""
    # TODO: Implement session ending
    logger.info("Ending session", session_id=session_id)
    
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Session not found"
    )


@router.get("/{session_id}/transcription", response_model=TranscriptionResponse)
async def get_transcription(
    session_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get session transcription."""
    # TODO: Implement transcription retrieval
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Transcription not found"
    )


@router.get("/{session_id}/insights", response_model=SessionInsights)
async def get_insights(
    session_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get AI-generated insights for a session."""
    # TODO: Implement insights retrieval
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Insights not found"
    )


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_session(
    session_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Cancel a scheduled session."""
    # TODO: Implement session cancellation
    logger.info("Cancelling session", session_id=session_id)
    return None