import os
import httpx
from typing import Optional, Dict, Any
from src.core import get_logger

logger = get_logger(__name__)


class EmailService:
    """Email service using Loops.so for transactional emails."""
    
    LOOPS_API_URL = "https://app.loops.so/api/v1"
    
    @staticmethod
    def send_invitation(
        to_email: str,
        coach_name: str,
        invitation_link: str,
        personal_message: Optional[str] = None
    ) -> bool:
        """Send invitation email to a new client using Loops.so."""
        
        # Get Loops.so API key from environment
        loops_api_key = os.getenv('LOOPS_API_KEY', '')
        
        if not loops_api_key:
            logger.warning(
                "Loops.so API key not configured. "
                "Set LOOPS_API_KEY environment variable to enable email sending."
            )
            logger.info(f"Would send invitation to {to_email} with link: {invitation_link}")
            return False
        
        try:
            # First, add or update the contact in Loops
            contact_data = {
                "email": to_email,
                "source": "invitation",
                "subscribed": True
            }
            
            with httpx.Client() as client:
                # Add/update contact
                contact_response = client.post(
                    f"{EmailService.LOOPS_API_URL}/contacts/update",
                    json=contact_data,
                    headers={
                        "Authorization": f"Bearer {loops_api_key}",
                        "Content-Type": "application/json"
                    }
                )
                
                if not contact_response.is_success:
                    logger.error(f"Failed to add contact to Loops: {contact_response.text}")
                    return False
                
                # Send transactional email
                email_data = {
                    "transactionalId": os.getenv('LOOPS_INVITATION_EMAIL_ID', 'client-invitation'),
                    "email": to_email,
                    "dataVariables": {
                        "coach_name": coach_name,
                        "invitation_link": invitation_link,
                        "personal_message": personal_message or "",
                        "has_message": bool(personal_message)
                    }
                }
                
                # Send the transactional email
                email_response = client.post(
                    f"{EmailService.LOOPS_API_URL}/transactional",
                    json=email_data,
                    headers={
                        "Authorization": f"Bearer {loops_api_key}",
                        "Content-Type": "application/json"
                    }
                )
                
                if email_response.is_success:
                    logger.info(f"Successfully sent invitation email to {to_email} via Loops.so")
                    return True
                else:
                    logger.error(f"Failed to send email via Loops: {email_response.text}")
                    return False
                    
        except Exception as e:
            logger.error(f"Failed to send email to {to_email} via Loops.so: {str(e)}")
            return False
    
    @staticmethod
    def send_session_reminder(
        to_email: str,
        client_name: str,
        coach_name: str,
        session_time: str,
        session_link: str
    ) -> bool:
        """Send session reminder email using Loops.so."""
        
        loops_api_key = os.getenv('LOOPS_API_KEY', '')
        
        if not loops_api_key:
            logger.warning("Loops.so API key not configured")
            return False
        
        try:
            with httpx.Client() as client:
                # Send transactional email
                email_data = {
                    "transactionalId": os.getenv('LOOPS_REMINDER_EMAIL_ID', 'session-reminder'),
                    "email": to_email,
                    "dataVariables": {
                        "client_name": client_name,
                        "coach_name": coach_name,
                        "session_time": session_time,
                        "session_link": session_link
                    }
                }
                
                email_response = client.post(
                    f"{EmailService.LOOPS_API_URL}/transactional",
                    json=email_data,
                    headers={
                        "Authorization": f"Bearer {loops_api_key}",
                        "Content-Type": "application/json"
                    }
                )
                
                if email_response.is_success:
                    logger.info(f"Successfully sent session reminder to {to_email}")
                    return True
                else:
                    logger.error(f"Failed to send reminder: {email_response.text}")
                    return False
                    
        except Exception as e:
            logger.error(f"Failed to send reminder to {to_email}: {str(e)}")
            return False
    
    @staticmethod
    def send_welcome_email(
        to_email: str,
        user_name: str,
        is_coach: bool = False
    ) -> bool:
        """Send welcome email to new users using Loops.so."""
        
        loops_api_key = os.getenv('LOOPS_API_KEY', '')
        
        if not loops_api_key:
            logger.warning("Loops.so API key not configured")
            return False
        
        try:
            with httpx.Client() as client:
                # Send transactional email
                template_id = 'welcome-coach' if is_coach else 'welcome-client'
                email_data = {
                    "transactionalId": os.getenv('LOOPS_WELCOME_EMAIL_ID', template_id),
                    "email": to_email,
                    "dataVariables": {
                        "user_name": user_name,
                        "user_type": "coach" if is_coach else "client"
                    }
                }
                
                email_response = client.post(
                    f"{EmailService.LOOPS_API_URL}/transactional",
                    json=email_data,
                    headers={
                        "Authorization": f"Bearer {loops_api_key}",
                        "Content-Type": "application/json"
                    }
                )
                
                if email_response.is_success:
                    logger.info(f"Successfully sent welcome email to {to_email}")
                    return True
                else:
                    logger.error(f"Failed to send welcome email: {email_response.text}")
                    return False
                    
        except Exception as e:
            logger.error(f"Failed to send welcome email to {to_email}: {str(e)}")
            return False