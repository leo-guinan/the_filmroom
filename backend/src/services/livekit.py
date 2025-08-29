from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import jwt
import time
from src.core import settings, get_logger

logger = get_logger(__name__)


class LiveKitService:
    """Service for managing LiveKit video sessions."""
    
    @staticmethod
    def generate_token(
        room_name: str,
        participant_name: str,
        participant_identity: str,
        metadata: Optional[Dict[str, Any]] = None,
        can_publish: bool = True,
        can_subscribe: bool = True,
        can_publish_data: bool = True,
        duration_hours: int = 2
    ) -> str:
        """
        Generate a LiveKit access token for a participant.
        
        Args:
            room_name: Name of the room to join
            participant_name: Display name of the participant
            participant_identity: Unique identifier for the participant (user_id)
            metadata: Optional metadata to attach to the participant
            can_publish: Whether participant can publish video/audio
            can_subscribe: Whether participant can subscribe to others
            can_publish_data: Whether participant can send data messages
            duration_hours: Token validity duration in hours
        
        Returns:
            JWT access token for LiveKit
        """
        # Token expiration
        exp = int(time.time()) + (duration_hours * 3600)
        
        # Video grant permissions
        video_grant = {
            "roomJoin": True,
            "room": room_name,
            "canPublish": can_publish,
            "canSubscribe": can_subscribe,
            "canPublishData": can_publish_data,
        }
        
        # Build the claims
        claims = {
            "exp": exp,
            "iss": settings.livekit_api_key,
            "sub": participant_identity,
            "name": participant_name,
            "video": video_grant,
            "metadata": metadata or {}
        }
        
        # Generate the token
        token = jwt.encode(
            claims,
            settings.livekit_api_secret,
            algorithm="HS256"
        )
        
        logger.info(
            f"Generated LiveKit token for {participant_name} in room {room_name}",
            room=room_name,
            participant=participant_identity
        )
        
        return token
    
    @staticmethod
    def generate_room_name(coach_id: str, client_id: str) -> str:
        """
        Generate a unique room name for a coach-client session.
        
        Args:
            coach_id: ID of the coach
            client_id: ID of the client
            
        Returns:
            Unique room name
        """
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        return f"session_{coach_id}_{client_id}_{timestamp}"
    
    @staticmethod
    def validate_room_access(
        user_id: str,
        room_name: str,
        session_participants: list
    ) -> bool:
        """
        Validate if a user has access to join a room.
        
        Args:
            user_id: ID of the user trying to join
            room_name: Name of the room
            session_participants: List of authorized participant IDs
            
        Returns:
            True if user can access the room
        """
        return user_id in session_participants