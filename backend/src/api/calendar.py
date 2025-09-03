from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel

from src.core import get_logger
from src.models.base import get_db
from src.models import User
from src.api.auth import get_current_user
from src.services.calendar import CalendarService

logger = get_logger(__name__)
router = APIRouter()


class CalendarSetupRequest(BaseModel):
    username: str
    timezone: str = "America/New_York"


class BookingRequest(BaseModel):
    coach_id: str
    start_time: datetime
    duration_minutes: int = 60
    title: str
    description: Optional[str] = None


class AvailabilityRequest(BaseModel):
    coach_id: str
    date_from: datetime
    date_to: datetime


@router.post("/setup")
async def setup_calendar(
    request: CalendarSetupRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Set up Cal.com integration for a coach."""
    if current_user.role != "COACH" and current_user.role != "coach":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only coaches can set up calendar integration"
        )
    
    if current_user.cal_username:
        return {
            "success": True,
            "message": "Calendar already set up",
            "booking_url": current_user.cal_booking_url
        }
    
    try:
        # Create Cal.com account
        result = CalendarService.create_coach_account(
            email=current_user.email,
            name=current_user.name,
            username=request.username
        )
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create Cal.com account"
            )
        
        # Update user with Cal.com details
        current_user.cal_username = request.username
        current_user.cal_user_id = result.get("user_id")
        current_user.cal_event_type_id = result.get("event_type_id")
        current_user.cal_booking_url = f"https://cal.com/{request.username}"
        
        db.commit()
        
        logger.info(f"Calendar set up for coach {current_user.id}")
        
        return {
            "success": True,
            "message": "Calendar integration set up successfully",
            "booking_url": current_user.cal_booking_url
        }
        
    except Exception as e:
        logger.error(f"Error setting up calendar: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to set up calendar integration"
        )


@router.get("/booking-url/{coach_id}")
async def get_booking_url(
    coach_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get the booking URL for a coach."""
    coach = db.query(User).filter(
        User.id == coach_id,
        (User.role == "COACH") | (User.role == "coach")
    ).first()
    
    if not coach:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coach not found"
        )
    
    if not coach.cal_booking_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Coach has not set up calendar integration"
        )
    
    return {
        "booking_url": coach.cal_booking_url,
        "coach_name": coach.name,
        "timezone": "America/New_York"  # TODO: Get from coach preferences
    }


@router.post("/book")
async def book_session(
    request: BookingRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Book a session with a coach."""
    coach = db.query(User).filter(
        User.id == request.coach_id,
        (User.role == "COACH") | (User.role == "coach")
    ).first()
    
    if not coach:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coach not found"
        )
    
    if not coach.cal_event_type_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Coach has not set up calendar integration"
        )
    
    try:
        booking = CalendarService.create_booking(
            event_type_id=coach.cal_event_type_id,
            start_time=request.start_time,
            attendee_email=current_user.email,
            attendee_name=current_user.name,
            metadata={
                "client_id": current_user.id,
                "coach_id": coach.id,
                "title": request.title,
                "description": request.description
            }
        )
        
        if not booking:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create booking"
            )
        
        # TODO: Create session record in database
        
        return {
            "success": True,
            "booking_id": booking.get("id"),
            "message": "Session booked successfully"
        }
        
    except Exception as e:
        logger.error(f"Error booking session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to book session"
        )


@router.post("/availability")
async def get_availability(
    request: AvailabilityRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get availability for a coach."""
    coach = db.query(User).filter(
        User.id == request.coach_id,
        (User.role == "COACH") | (User.role == "coach")
    ).first()
    
    if not coach:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coach not found"
        )
    
    if not coach.cal_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Coach has not set up calendar integration"
        )
    
    try:
        availability = CalendarService.get_availability(
            username=coach.cal_username,
            date_from=request.date_from,
            date_to=request.date_to
        )
        
        return {
            "availability": availability,
            "coach_name": coach.name
        }
        
    except Exception as e:
        logger.error(f"Error getting availability: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get availability"
        )


@router.post("/sync/{session_id}")
async def sync_calendar_event(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Sync a session with Cal.com."""
    # TODO: Implement calendar sync for existing sessions
    return {"message": "Calendar sync not yet implemented"}