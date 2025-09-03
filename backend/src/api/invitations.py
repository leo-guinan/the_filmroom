from fastapi import APIRouter, HTTPException, Depends, Query, status, BackgroundTasks
from sqlalchemy.orm import Session as DBSession
from sqlalchemy import or_, and_
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel, EmailStr, Field

from src.core import get_logger, settings
from src.models import get_db, User, Invitation, InvitationStatus, CoachClientRelationship
from src.models.user import UserRole
from src.services.auth import get_current_active_user
# from src.services.email import EmailService  # TODO: Implement email service

router = APIRouter()
logger = get_logger(__name__)


class InviteClientRequest(BaseModel):
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    message: Optional[str] = Field(None, max_length=500)


class ResendInvitationRequest(BaseModel):
    invitation_id: str


class InvitationResponse(BaseModel):
    id: str
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    status: InvitationStatus
    created_at: datetime
    expires_at: datetime
    accepted_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class AcceptInvitationRequest(BaseModel):
    token: str
    password: str = Field(..., min_length=8)
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)


class ClientListResponse(BaseModel):
    id: str
    email: str
    full_name: str
    created_at: datetime
    last_session: Optional[datetime] = None
    total_sessions: int = 0
    relationship_id: str
    
    class Config:
        from_attributes = True


@router.post("/invite", response_model=InvitationResponse)
async def invite_client(
    request: InviteClientRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    db: DBSession = Depends(get_db)
):
    """Send an invitation to a new client."""
    
    # Only coaches can send invitations
    if current_user.role != UserRole.COACH:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only coaches can send invitations"
        )
    
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        # Check if already connected
        existing_relationship = db.query(CoachClientRelationship).filter(
            CoachClientRelationship.coach_id == current_user.id,
            CoachClientRelationship.client_id == existing_user.id,
            CoachClientRelationship.is_active == True
        ).first()
        
        if existing_relationship:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You are already connected with this client"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This email is already registered. The user can log in directly."
            )
    
    # Check for pending invitation
    pending_invitation = db.query(Invitation).filter(
        Invitation.email == request.email,
        Invitation.coach_id == current_user.id,
        Invitation.status == InvitationStatus.PENDING,
        Invitation.expires_at > datetime.utcnow()
    ).first()
    
    if pending_invitation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An invitation to this email is already pending"
        )
    
    # Create invitation
    invitation = Invitation(
        email=request.email,
        first_name=request.first_name,
        last_name=request.last_name,
        message=request.message,
        coach_id=current_user.id
    )
    
    db.add(invitation)
    db.commit()
    db.refresh(invitation)
    
    # Send invitation email (in background)
    background_tasks.add_task(
        send_invitation_email,
        invitation=invitation,
        coach_name=current_user.full_name,
        app_url=settings.frontend_url if hasattr(settings, 'frontend_url') else "https://filmroom.leoasaservice.com"
    )
    
    logger.info(f"Invitation sent to {request.email} by coach {current_user.email}")
    
    return InvitationResponse(
        id=invitation.id,
        email=invitation.email,
        first_name=invitation.first_name,
        last_name=invitation.last_name,
        status=invitation.status,
        created_at=invitation.created_at,
        expires_at=invitation.expires_at,
        accepted_at=invitation.accepted_at
    )


@router.get("/invitations", response_model=List[InvitationResponse])
async def list_invitations(
    status_filter: Optional[InvitationStatus] = None,
    current_user: User = Depends(get_current_active_user),
    db: DBSession = Depends(get_db)
):
    """List all invitations sent by the current coach."""
    
    if current_user.role != UserRole.COACH:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only coaches can view invitations"
        )
    
    query = db.query(Invitation).filter(Invitation.coach_id == current_user.id)
    
    if status_filter:
        query = query.filter(Invitation.status == status_filter)
    
    # Order by most recent first
    invitations = query.order_by(Invitation.created_at.desc()).all()
    
    # Update expired invitations
    for invitation in invitations:
        if invitation.is_expired and invitation.status == InvitationStatus.PENDING:
            invitation.status = InvitationStatus.EXPIRED
            db.commit()
    
    return [
        InvitationResponse(
            id=inv.id,
            email=inv.email,
            first_name=inv.first_name,
            last_name=inv.last_name,
            status=inv.status,
            created_at=inv.created_at,
            expires_at=inv.expires_at,
            accepted_at=inv.accepted_at
        )
        for inv in invitations
    ]


@router.post("/invitations/{invitation_id}/resend")
async def resend_invitation(
    invitation_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    db: DBSession = Depends(get_db)
):
    """Resend an invitation email."""
    
    invitation = db.query(Invitation).filter(
        Invitation.id == invitation_id,
        Invitation.coach_id == current_user.id
    ).first()
    
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found"
        )
    
    if invitation.status != InvitationStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot resend invitation with status: {invitation.status}"
        )
    
    # Refresh expiration
    invitation.expires_at = datetime.utcnow() + timedelta(days=7)
    db.commit()
    
    # Resend email
    background_tasks.add_task(
        send_invitation_email,
        invitation=invitation,
        coach_name=current_user.full_name,
        app_url=settings.frontend_url if hasattr(settings, 'frontend_url') else "https://filmroom.leoasaservice.com"
    )
    
    logger.info(f"Invitation resent to {invitation.email}")
    
    return {"message": "Invitation resent successfully"}


@router.post("/invitations/{invitation_id}/cancel")
async def cancel_invitation(
    invitation_id: str,
    current_user: User = Depends(get_current_active_user),
    db: DBSession = Depends(get_db)
):
    """Cancel a pending invitation."""
    
    invitation = db.query(Invitation).filter(
        Invitation.id == invitation_id,
        Invitation.coach_id == current_user.id
    ).first()
    
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found"
        )
    
    if invitation.status != InvitationStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel invitation with status: {invitation.status}"
        )
    
    invitation.status = InvitationStatus.CANCELLED
    db.commit()
    
    logger.info(f"Invitation to {invitation.email} cancelled")
    
    return {"message": "Invitation cancelled successfully"}


@router.get("/clients", response_model=List[ClientListResponse])
async def list_my_clients(
    current_user: User = Depends(get_current_active_user),
    db: DBSession = Depends(get_db)
):
    """List all clients connected to the current coach."""
    
    if current_user.role != UserRole.COACH:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only coaches can view their clients"
        )
    
    # Get all active coach-client relationships
    relationships = db.query(CoachClientRelationship).filter(
        CoachClientRelationship.coach_id == current_user.id,
        CoachClientRelationship.is_active == True
    ).all()
    
    clients = []
    for rel in relationships:
        client = rel.client
        
        # Get session statistics
        from src.models.session import Session, SessionStatus
        last_session = db.query(Session).filter(
            Session.coach_id == current_user.id,
            Session.client_id == client.id,
            Session.status == SessionStatus.COMPLETED
        ).order_by(Session.ended_at.desc()).first()
        
        total_sessions = db.query(Session).filter(
            Session.coach_id == current_user.id,
            Session.client_id == client.id,
            Session.status == SessionStatus.COMPLETED
        ).count()
        
        clients.append(ClientListResponse(
            id=client.id,
            email=client.email,
            full_name=client.full_name,
            created_at=client.created_at,
            last_session=last_session.ended_at if last_session else None,
            total_sessions=total_sessions,
            relationship_id=rel.id
        ))
    
    return clients


@router.delete("/clients/{relationship_id}")
async def remove_client(
    relationship_id: str,
    current_user: User = Depends(get_current_active_user),
    db: DBSession = Depends(get_db)
):
    """Remove a client (deactivate the relationship)."""
    
    relationship = db.query(CoachClientRelationship).filter(
        CoachClientRelationship.id == relationship_id,
        CoachClientRelationship.coach_id == current_user.id
    ).first()
    
    if not relationship:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client relationship not found"
        )
    
    relationship.is_active = False
    relationship.deactivated_at = datetime.utcnow()
    db.commit()
    
    logger.info(f"Coach {current_user.email} removed client {relationship.client_id}")
    
    return {"message": "Client removed successfully"}


# Email sending function (to be implemented with actual email service)
async def send_invitation_email(invitation: Invitation, coach_name: str, app_url: str):
    """Send invitation email to client."""
    try:
        # For now, just log the invitation
        # In production, this would use an email service like SendGrid, AWS SES, etc.
        
        invitation_link = f"{app_url}/signup?invitation={invitation.token}"
        
        logger.info(
            f"Sending invitation email to {invitation.email}",
            invitation_link=invitation_link,
            coach_name=coach_name
        )
        
        # TODO: Implement actual email sending
        # EmailService.send_invitation(
        #     to_email=invitation.email,
        #     coach_name=coach_name,
        #     invitation_link=invitation_link,
        #     personal_message=invitation.message
        # )
        
    except Exception as e:
        logger.error(f"Failed to send invitation email: {str(e)}")