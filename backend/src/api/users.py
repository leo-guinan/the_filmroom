from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

from core import get_logger
from .auth import oauth2_scheme

router = APIRouter()
logger = get_logger(__name__)


class UserProfile(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: str
    created_at: datetime
    updated_at: datetime
    is_active: bool = True


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    timezone: Optional[str] = None
    bio: Optional[str] = None


class ClientProfile(BaseModel):
    id: str
    user_id: str
    coach_id: str
    notes: Optional[str] = None
    goals: Optional[str] = None
    created_at: datetime
    last_session_at: Optional[datetime] = None


@router.get("/profile", response_model=UserProfile)
async def get_profile(token: str = Depends(oauth2_scheme)):
    """Get user profile."""
    # TODO: Implement profile retrieval
    return {
        "id": "dummy_id",
        "email": "user@example.com",
        "full_name": "Test User",
        "role": "client",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "is_active": True,
    }


@router.put("/profile", response_model=UserProfile)
async def update_profile(
    update_data: UserUpdate,
    token: str = Depends(oauth2_scheme)
):
    """Update user profile."""
    # TODO: Implement profile update
    logger.info("Profile update", updates=update_data.dict(exclude_unset=True))
    
    return {
        "id": "dummy_id",
        "email": "user@example.com",
        "full_name": update_data.full_name or "Test User",
        "role": "client",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "is_active": True,
    }


@router.get("/coaches", response_model=List[UserProfile])
async def list_coaches(
    skip: int = 0,
    limit: int = 20,
    token: str = Depends(oauth2_scheme)
):
    """List all available coaches."""
    # TODO: Implement coach listing
    return []


@router.get("/clients", response_model=List[ClientProfile])
async def list_clients(
    skip: int = 0,
    limit: int = 20,
    token: str = Depends(oauth2_scheme)
):
    """List all clients for a coach."""
    # TODO: Implement client listing for coaches
    return []


@router.get("/clients/{client_id}", response_model=ClientProfile)
async def get_client(
    client_id: str,
    token: str = Depends(oauth2_scheme)
):
    """Get specific client details."""
    # TODO: Implement client retrieval
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Client not found"
    )