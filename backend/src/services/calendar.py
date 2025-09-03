import os
import requests
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from src.core import get_logger

logger = get_logger(__name__)


class CalendarService:
    """Cal.com integration for session scheduling."""
    
    CAL_API_URL = "https://api.cal.com/v1"
    CAL_API_KEY = os.getenv("CAL_API_KEY")
    CAL_DOMAIN = os.getenv("CAL_DOMAIN", "cal.com")
    
    @staticmethod
    def _get_headers() -> Dict[str, str]:
        """Get headers for Cal.com API requests."""
        return {
            "Authorization": f"Bearer {CalendarService.CAL_API_KEY}",
            "Content-Type": "application/json"
        }
    
    @staticmethod
    def create_coach_account(email: str, name: str, username: str) -> Optional[Dict[str, Any]]:
        """Create a Cal.com account for a coach."""
        if not CalendarService.CAL_API_KEY:
            logger.warning("Cal.com API key not configured")
            # For now, return mock data to allow testing
            return {
                "user_id": f"mock_user_{username}",
                "event_type_id": f"mock_event_{username}",
                "booking_url": f"https://{CalendarService.CAL_DOMAIN}/{username}"
            }
        
        try:
            # Create user account
            response = requests.post(
                f"{CalendarService.CAL_API_URL}/users",
                headers=CalendarService._get_headers(),
                json={
                    "email": email,
                    "username": username,
                    "name": name,
                    "timeZone": "America/New_York"
                }
            )
            
            if response.status_code != 200:
                logger.error(f"Failed to create Cal.com user: {response.text}")
                return None
            
            user_data = response.json()
            user_id = user_data.get("id")
            
            # Create default event type (60-minute coaching session)
            event_response = requests.post(
                f"{CalendarService.CAL_API_URL}/event-types",
                headers=CalendarService._get_headers(),
                json={
                    "title": "Coaching Session",
                    "slug": "coaching-session",
                    "length": 60,
                    "description": "1-on-1 coaching session",
                    "userId": user_id
                }
            )
            
            if event_response.status_code != 200:
                logger.error(f"Failed to create event type: {event_response.text}")
            
            event_data = event_response.json()
            
            return {
                "user_id": user_id,
                "event_type_id": event_data.get("id"),
                "booking_url": f"https://{CalendarService.CAL_DOMAIN}/{username}"
            }
            
        except Exception as e:
            logger.error(f"Error creating Cal.com account: {e}")
            return None
    
    @staticmethod
    def create_booking(
        event_type_id: str,
        start_time: datetime,
        attendee_email: str,
        attendee_name: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        """Create a booking in Cal.com."""
        if not CalendarService.CAL_API_KEY:
            logger.warning("Cal.com API key not configured")
            # Return mock data for testing
            return {
                "id": f"mock_booking_{start_time.isoformat()}",
                "start_time": start_time.isoformat(),
                "end_time": (start_time + timedelta(hours=1)).isoformat()
            }
        
        try:
            response = requests.post(
                f"{CalendarService.CAL_API_URL}/bookings",
                headers=CalendarService._get_headers(),
                json={
                    "eventTypeId": event_type_id,
                    "start": start_time.isoformat(),
                    "responses": {
                        "email": attendee_email,
                        "name": attendee_name
                    },
                    "metadata": metadata or {}
                }
            )
            
            if response.status_code != 200:
                logger.error(f"Failed to create booking: {response.text}")
                return None
            
            return response.json()
            
        except Exception as e:
            logger.error(f"Error creating booking: {e}")
            return None
    
    @staticmethod
    def get_availability(
        username: str,
        date_from: datetime,
        date_to: datetime
    ) -> List[Dict[str, Any]]:
        """Get availability for a user."""
        if not CalendarService.CAL_API_KEY:
            logger.warning("Cal.com API key not configured")
            # Return mock availability for testing
            slots = []
            current = date_from.replace(hour=9, minute=0, second=0, microsecond=0)
            
            while current < date_to:
                # Add slots from 9 AM to 5 PM on weekdays
                if current.weekday() < 5:  # Monday to Friday
                    for hour in range(9, 17):  # 9 AM to 5 PM
                        slot_time = current.replace(hour=hour, minute=0)
                        if slot_time >= date_from and slot_time < date_to:
                            slots.append({
                                "time": slot_time.isoformat(),
                                "available": True
                            })
                current = current + timedelta(days=1)
            
            return slots
        
        try:
            response = requests.get(
                f"{CalendarService.CAL_API_URL}/availability",
                headers=CalendarService._get_headers(),
                params={
                    "username": username,
                    "dateFrom": date_from.isoformat(),
                    "dateTo": date_to.isoformat()
                }
            )
            
            if response.status_code != 200:
                logger.error(f"Failed to get availability: {response.text}")
                return []
            
            return response.json().get("slots", [])
            
        except Exception as e:
            logger.error(f"Error getting availability: {e}")
            return []
    
    @staticmethod
    def cancel_booking(booking_id: str, reason: Optional[str] = None) -> bool:
        """Cancel a booking."""
        if not CalendarService.CAL_API_KEY:
            logger.warning("Cal.com API key not configured")
            return True  # Return success for testing
        
        try:
            response = requests.delete(
                f"{CalendarService.CAL_API_URL}/bookings/{booking_id}",
                headers=CalendarService._get_headers(),
                json={"cancellationReason": reason} if reason else {}
            )
            
            return response.status_code == 200
            
        except Exception as e:
            logger.error(f"Error canceling booking: {e}")
            return False
    
    @staticmethod
    def update_booking(
        booking_id: str,
        start_time: Optional[datetime] = None,
        title: Optional[str] = None,
        description: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Update an existing booking."""
        if not CalendarService.CAL_API_KEY:
            logger.warning("Cal.com API key not configured")
            return {"id": booking_id, "updated": True}
        
        try:
            update_data = {}
            if start_time:
                update_data["start"] = start_time.isoformat()
            if title:
                update_data["title"] = title
            if description:
                update_data["description"] = description
            
            response = requests.patch(
                f"{CalendarService.CAL_API_URL}/bookings/{booking_id}",
                headers=CalendarService._get_headers(),
                json=update_data
            )
            
            if response.status_code != 200:
                logger.error(f"Failed to update booking: {response.text}")
                return None
            
            return response.json()
            
        except Exception as e:
            logger.error(f"Error updating booking: {e}")
            return None