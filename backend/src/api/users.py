from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from src.core import get_logger
from src.models import get_db, User
from src.services.auth import get_current_active_user, require_coach, require_admin
from src.services.user import UserService

router = APIRouter()
logger = get_logger(__name__)


class UserProfile(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: str
    phone: Optional[str] = None
    timezone: str
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    is_active: bool
    is_verified: bool
    
    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    timezone: Optional[str] = None
    bio: Optional[str] = None


class ClientProfileResponse(BaseModel):
    id: str
    client_id: str
    coach_id: str
    client_name: str
    client_email: str
    coaching_goals: Optional[str] = None
    background_info: Optional[str] = None
    total_sessions: int
    completed_sessions: int
    last_session_date: Optional[datetime] = None
    created_at: datetime
    is_active: bool
    
    class Config:
        from_attributes = True


class ClientProfileCreate(BaseModel):
    client_email: EmailStr
    coaching_goals: Optional[str] = None
    background_info: Optional[str] = None


class ClientProfileUpdate(BaseModel):
    coaching_goals: Optional[str] = None
    background_info: Optional[str] = None
    current_challenges: Optional[dict] = None
    achievements: Optional[dict] = None


@router.get("/me")
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user)
):
    """Get current user's information."""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "first_name": current_user.full_name.split()[0] if current_user.full_name else "",
        "last_name": " ".join(current_user.full_name.split()[1:]) if current_user.full_name and len(current_user.full_name.split()) > 1 else "",
        "full_name": current_user.full_name,
        "role": current_user.role.value if hasattr(current_user.role, 'value') else current_user.role,
        "phone": current_user.phone,
        "timezone": current_user.timezone or "America/New_York",
        "bio": current_user.bio,
        "avatar_url": current_user.avatar_url,
        "created_at": current_user.created_at,
        "updated_at": current_user.updated_at,
        "is_active": current_user.is_active,
        "is_verified": current_user.is_verified,
        "cal_username": getattr(current_user, 'cal_username', None),
        "cal_booking_url": getattr(current_user, 'cal_booking_url', None),
    }


@router.patch("/me")
async def update_current_user(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update current user's information."""
    # Build full name from first and last if provided
    full_name = current_user.full_name
    if update_data.first_name is not None or update_data.last_name is not None:
        first = update_data.first_name or current_user.full_name.split()[0] if current_user.full_name else ""
        last = update_data.last_name or " ".join(current_user.full_name.split()[1:]) if current_user.full_name and len(current_user.full_name.split()) > 1 else ""
        full_name = f"{first} {last}".strip()
    elif update_data.full_name is not None:
        full_name = update_data.full_name
    
    updated_user = UserService.update_user(
        db=db,
        user=current_user,
        full_name=full_name,
        phone=update_data.phone,
        timezone=update_data.timezone,
        bio=update_data.bio
    )
    
    logger.info(f"User updated via /me: {current_user.email}")
    
    return {
        "id": updated_user.id,
        "email": updated_user.email,
        "first_name": updated_user.full_name.split()[0] if updated_user.full_name else "",
        "last_name": " ".join(updated_user.full_name.split()[1:]) if updated_user.full_name and len(updated_user.full_name.split()) > 1 else "",
        "full_name": updated_user.full_name,
        "role": updated_user.role.value if hasattr(updated_user.role, 'value') else updated_user.role,
        "phone": updated_user.phone,
        "timezone": updated_user.timezone,
        "bio": updated_user.bio,
        "avatar_url": updated_user.avatar_url,
        "created_at": updated_user.created_at,
        "updated_at": updated_user.updated_at,
        "is_active": updated_user.is_active,
        "is_verified": updated_user.is_verified,
        "cal_username": getattr(updated_user, 'cal_username', None),
        "cal_booking_url": getattr(updated_user, 'cal_booking_url', None),
    }


@router.get("/profile", response_model=UserProfile)
async def get_profile(
    current_user: User = Depends(get_current_active_user)
):
    """Get current user's profile."""
    return UserProfile(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role.value,
        phone=current_user.phone,
        timezone=current_user.timezone,
        bio=current_user.bio,
        avatar_url=current_user.avatar_url,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at,
        is_active=current_user.is_active,
        is_verified=current_user.is_verified
    )


@router.put("/profile", response_model=UserProfile)
async def update_profile(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update current user's profile."""
    updated_user = UserService.update_user(
        db=db,
        user=current_user,
        full_name=update_data.full_name,
        phone=update_data.phone,
        timezone=update_data.timezone,
        bio=update_data.bio
    )
    
    logger.info(f"Profile updated: {current_user.email}")
    
    return UserProfile(
        id=updated_user.id,
        email=updated_user.email,
        full_name=updated_user.full_name,
        role=updated_user.role.value,
        phone=updated_user.phone,
        timezone=updated_user.timezone,
        bio=updated_user.bio,
        avatar_url=updated_user.avatar_url,
        created_at=updated_user.created_at,
        updated_at=updated_user.updated_at,
        is_active=updated_user.is_active,
        is_verified=updated_user.is_verified
    )


@router.get("/coaches", response_model=List[UserProfile])
async def list_coaches(
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List all available coaches."""
    coaches = UserService.get_coaches(db, skip=skip, limit=limit)
    
    return [
        UserProfile(
            id=coach.id,
            email=coach.email,
            full_name=coach.full_name,
            role=coach.role.value,
            phone=coach.phone,
            timezone=coach.timezone,
            bio=coach.bio,
            avatar_url=coach.avatar_url,
            created_at=coach.created_at,
            updated_at=coach.updated_at,
            is_active=coach.is_active,
            is_verified=coach.is_verified
        )
        for coach in coaches
    ]


@router.get("/clients", response_model=List[ClientProfileResponse])
async def list_clients(
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(require_coach),
    db: Session = Depends(get_db)
):
    """List all clients for a coach."""
    client_profiles = UserService.get_coach_clients(
        db, 
        coach_id=current_user.id, 
        skip=skip, 
        limit=limit
    )
    
    result = []
    for profile in client_profiles:
        # Get client user data
        client_user = UserService.get_user_by_id(db, profile.client_id)
        if client_user:
            result.append(
                ClientProfileResponse(
                    id=profile.id,
                    client_id=profile.client_id,
                    coach_id=profile.coach_id,
                    client_name=client_user.full_name,
                    client_email=client_user.email,
                    coaching_goals=profile.coaching_goals,
                    background_info=profile.background_info,
                    total_sessions=profile.total_sessions,
                    completed_sessions=profile.completed_sessions,
                    last_session_date=profile.last_session_date,
                    created_at=profile.created_at,
                    is_active=profile.is_active
                )
            )
    
    return result


@router.post("/clients", response_model=ClientProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_client_profile(
    profile_data: ClientProfileCreate,
    current_user: User = Depends(require_coach),
    db: Session = Depends(get_db)
):
    """Create a client profile (coaches only)."""
    # Find or create client user
    client = UserService.get_user_by_email(db, profile_data.client_email)
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client user not found. Client must register first."
        )
    
    # Create profile
    try:
        profile = UserService.create_client_profile(
            db=db,
            client=client,
            coach=current_user,
            coaching_goals=profile_data.coaching_goals,
            background_info=profile_data.background_info
        )
        
        return ClientProfileResponse(
            id=profile.id,
            client_id=profile.client_id,
            coach_id=profile.coach_id,
            client_name=client.full_name,
            client_email=client.email,
            coaching_goals=profile.coaching_goals,
            background_info=profile.background_info,
            total_sessions=0,
            completed_sessions=0,
            last_session_date=None,
            created_at=profile.created_at,
            is_active=profile.is_active
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating client profile: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create client profile"
        )


@router.get("/clients/{client_id}", response_model=ClientProfileResponse)
async def get_client(
    client_id: str,
    current_user: User = Depends(require_coach),
    db: Session = Depends(get_db)
):
    """Get specific client details (coaches only)."""
    profile = UserService.get_client_profile(db, client_id, current_user.id)
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client profile not found"
        )
    
    # Get client user data
    client_user = UserService.get_user_by_id(db, profile.client_id)
    if not client_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client user not found"
        )
    
    return ClientProfileResponse(
        id=profile.id,
        client_id=profile.client_id,
        coach_id=profile.coach_id,
        client_name=client_user.full_name,
        client_email=client_user.email,
        coaching_goals=profile.coaching_goals,
        background_info=profile.background_info,
        total_sessions=profile.total_sessions,
        completed_sessions=profile.completed_sessions,
        last_session_date=profile.last_session_date,
        created_at=profile.created_at,
        is_active=profile.is_active
    )


@router.put("/clients/{client_id}", response_model=ClientProfileResponse)
async def update_client_profile(
    client_id: str,
    update_data: ClientProfileUpdate,
    current_user: User = Depends(require_coach),
    db: Session = Depends(get_db)
):
    """Update client profile (coaches only)."""
    profile = UserService.get_client_profile(db, client_id, current_user.id)
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client profile not found"
        )
    
    # Update profile
    updated_profile = UserService.update_client_profile(
        db=db,
        profile=profile,
        coaching_goals=update_data.coaching_goals,
        background_info=update_data.background_info,
        current_challenges=update_data.current_challenges,
        achievements=update_data.achievements
    )
    
    # Get client user data
    client_user = UserService.get_user_by_id(db, profile.client_id)
    
    return ClientProfileResponse(
        id=updated_profile.id,
        client_id=updated_profile.client_id,
        coach_id=updated_profile.coach_id,
        client_name=client_user.full_name,
        client_email=client_user.email,
        coaching_goals=updated_profile.coaching_goals,
        background_info=updated_profile.background_info,
        total_sessions=updated_profile.total_sessions,
        completed_sessions=updated_profile.completed_sessions,
        last_session_date=updated_profile.last_session_date,
        created_at=updated_profile.created_at,
        is_active=updated_profile.is_active
    )


@router.delete("/profile", status_code=status.HTTP_200_OK)
async def deactivate_account(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Deactivate current user's account."""
    UserService.deactivate_user(db, current_user)
    return {"message": "Account deactivated successfully"}