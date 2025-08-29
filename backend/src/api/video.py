from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session

from src.core import get_logger
from src.models import get_db, User, Session as SessionModel
from src.services.auth import get_current_active_user
from src.services.livekit import LiveKitService

router = APIRouter()
logger = get_logger(__name__)


class RoomTokenRequest(BaseModel):
    """Request model for getting a room token."""
    session_id: str = Field(..., description="ID of the session to join")


class RoomTokenResponse(BaseModel):
    """Response model for room token."""
    token: str = Field(..., description="LiveKit access token")
    url: str = Field(..., description="LiveKit server URL")
    room_name: str = Field(..., description="Name of the room to join")


class CreateTestRoomRequest(BaseModel):
    """Request model for creating a test room."""
    room_name: Optional[str] = Field(None, description="Optional room name")


@router.post("/token", response_model=RoomTokenResponse)
async def get_room_token(
    request: RoomTokenRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get a LiveKit access token for joining a session.
    
    This endpoint validates that the user is authorized to join the session
    and returns a LiveKit token with appropriate permissions.
    """
    # TODO: Fetch session from database and validate access
    # For now, we'll create a test implementation
    
    # Generate room name (in production, this would come from the session)
    room_name = f"session_{request.session_id}"
    
    # Determine user role and permissions
    # Coaches get full permissions, clients get limited
    can_publish = True
    can_publish_data = True
    
    # Generate metadata
    metadata = {
        "user_id": str(current_user.id),
        "user_role": current_user.role.value if hasattr(current_user.role, 'value') else current_user.role,
        "session_id": request.session_id
    }
    
    # Generate token
    token = LiveKitService.generate_token(
        room_name=room_name,
        participant_name=current_user.full_name,
        participant_identity=str(current_user.id),
        metadata=metadata,
        can_publish=can_publish,
        can_subscribe=True,
        can_publish_data=can_publish_data
    )
    
    # Get LiveKit URL (remove ws:// or wss:// prefix for client)
    from src.core import settings
    livekit_url = settings.livekit_url.replace("ws://", "").replace("wss://", "")
    
    logger.info(
        f"Generated room token for user {current_user.email} in session {request.session_id}"
    )
    
    return RoomTokenResponse(
        token=token,
        url=livekit_url,
        room_name=room_name
    )


@router.post("/test-room", response_model=RoomTokenResponse)
async def create_test_room(
    request: CreateTestRoomRequest,
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a test room for development/testing purposes.
    
    This endpoint creates a temporary room that can be used to test
    video functionality without a full session setup.
    """
    # Generate room name
    room_name = request.room_name or f"test_room_{current_user.id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
    
    # Generate metadata
    metadata = {
        "user_id": str(current_user.id),
        "user_role": current_user.role.value if hasattr(current_user.role, 'value') else current_user.role,
        "test_room": True
    }
    
    # Generate token with full permissions for testing
    token = LiveKitService.generate_token(
        room_name=room_name,
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
    
    logger.info(f"Created test room {room_name} for user {current_user.email}")
    
    return RoomTokenResponse(
        token=token,
        url=livekit_url,
        room_name=room_name
    )


@router.get("/room/{room_name}/participants")
async def get_room_participants(
    room_name: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    Get list of participants in a room.
    
    Note: This requires LiveKit server API access which we'll implement later.
    For now, this is a placeholder.
    """
    # TODO: Implement LiveKit server API to get room participants
    return {
        "room_name": room_name,
        "participants": [],
        "message": "Server API integration pending"
    }