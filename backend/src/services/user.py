from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import or_
from fastapi import HTTPException, status

from core import get_logger
from models import User, ClientProfile
from models.user import UserRole

logger = get_logger(__name__)


class UserService:
    """Service for user management."""
    
    @staticmethod
    def get_user_by_id(db: Session, user_id: str) -> Optional[User]:
        """Get a user by ID."""
        return db.query(User).filter(User.id == user_id).first()
    
    @staticmethod
    def get_user_by_email(db: Session, email: str) -> Optional[User]:
        """Get a user by email."""
        return db.query(User).filter(User.email == email).first()
    
    @staticmethod
    def update_user(
        db: Session,
        user: User,
        full_name: Optional[str] = None,
        phone: Optional[str] = None,
        timezone: Optional[str] = None,
        bio: Optional[str] = None,
        avatar_url: Optional[str] = None
    ) -> User:
        """Update user profile."""
        if full_name is not None:
            user.full_name = full_name
        if phone is not None:
            user.phone = phone
        if timezone is not None:
            user.timezone = timezone
        if bio is not None:
            user.bio = bio
        if avatar_url is not None:
            user.avatar_url = avatar_url
        
        db.commit()
        db.refresh(user)
        return user
    
    @staticmethod
    def get_coaches(db: Session, skip: int = 0, limit: int = 20) -> List[User]:
        """Get all coaches."""
        return db.query(User).filter(
            User.role == UserRole.COACH,
            User.is_active == True
        ).offset(skip).limit(limit).all()
    
    @staticmethod
    def get_coach_clients(
        db: Session,
        coach_id: str,
        skip: int = 0,
        limit: int = 20
    ) -> List[ClientProfile]:
        """Get all clients for a coach."""
        return db.query(ClientProfile).filter(
            ClientProfile.coach_id == coach_id,
            ClientProfile.is_active == True
        ).offset(skip).limit(limit).all()
    
    @staticmethod
    def create_client_profile(
        db: Session,
        client: User,
        coach: User,
        coaching_goals: Optional[str] = None,
        background_info: Optional[str] = None
    ) -> ClientProfile:
        """Create a client profile linking a client to a coach."""
        # Check if profile already exists
        existing = db.query(ClientProfile).filter(
            ClientProfile.client_id == client.id,
            ClientProfile.coach_id == coach.id
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Client profile already exists for this coach-client pair"
            )
        
        # Create profile
        profile = ClientProfile(
            client_id=client.id,
            coach_id=coach.id,
            coaching_goals=coaching_goals,
            background_info=background_info,
            is_active=True
        )
        
        db.add(profile)
        db.commit()
        db.refresh(profile)
        
        logger.info(f"Created client profile: client={client.email}, coach={coach.email}")
        return profile
    
    @staticmethod
    def get_client_profile(
        db: Session,
        client_id: str,
        coach_id: str
    ) -> Optional[ClientProfile]:
        """Get a specific client profile."""
        return db.query(ClientProfile).filter(
            ClientProfile.client_id == client_id,
            ClientProfile.coach_id == coach_id
        ).first()
    
    @staticmethod
    def update_client_profile(
        db: Session,
        profile: ClientProfile,
        coaching_goals: Optional[str] = None,
        background_info: Optional[str] = None,
        current_challenges: Optional[dict] = None,
        achievements: Optional[dict] = None
    ) -> ClientProfile:
        """Update a client profile."""
        if coaching_goals is not None:
            profile.coaching_goals = coaching_goals
        if background_info is not None:
            profile.background_info = background_info
        if current_challenges is not None:
            profile.current_challenges = current_challenges
        if achievements is not None:
            profile.achievements = achievements
        
        db.commit()
        db.refresh(profile)
        return profile
    
    @staticmethod
    def deactivate_user(db: Session, user: User) -> User:
        """Deactivate a user account."""
        user.is_active = False
        db.commit()
        db.refresh(user)
        
        logger.info(f"User deactivated: {user.email}")
        return user
    
    @staticmethod
    def reactivate_user(db: Session, user: User) -> User:
        """Reactivate a user account."""
        user.is_active = True
        db.commit()
        db.refresh(user)
        
        logger.info(f"User reactivated: {user.email}")
        return user