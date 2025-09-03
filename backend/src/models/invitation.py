from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, Enum, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta
import enum
import uuid
import secrets

from .base import Base


class InvitationStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class Invitation(Base):
    __tablename__ = "invitations"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Invitation details
    email = Column(String, nullable=False, index=True)
    token = Column(String, nullable=False, unique=True, index=True, default=lambda: secrets.urlsafe_token(32))
    status = Column(Enum(InvitationStatus), nullable=False, default=InvitationStatus.PENDING)
    
    # Personal details (optional, for personalization)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    message = Column(Text, nullable=True)  # Personal message from coach
    
    # Coach who sent the invitation
    coach_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    # Client who accepted (filled when invitation is accepted)
    client_id = Column(String, ForeignKey("users.id"), nullable=True)
    
    # Timing
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, default=lambda: datetime.utcnow() + timedelta(days=7), nullable=False)
    accepted_at = Column(DateTime, nullable=True)
    
    # Relationships
    coach = relationship("User", foreign_keys=[coach_id], back_populates="sent_invitations")
    client = relationship("User", foreign_keys=[client_id], back_populates="received_invitation")
    
    def __repr__(self):
        return f"<Invitation {self.email} - {self.status}>"
    
    @property
    def is_expired(self):
        return datetime.utcnow() > self.expires_at and self.status == InvitationStatus.PENDING
    
    @property
    def is_valid(self):
        return (
            self.status == InvitationStatus.PENDING and 
            datetime.utcnow() <= self.expires_at
        )


class CoachClientRelationship(Base):
    __tablename__ = "coach_client_relationships"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    coach_id = Column(String, ForeignKey("users.id"), nullable=False)
    client_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    # Relationship metadata
    invitation_id = Column(String, ForeignKey("invitations.id"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    notes = Column(Text, nullable=True)  # Coach's private notes about the client
    
    # Timing
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    deactivated_at = Column(DateTime, nullable=True)
    
    # Relationships
    coach = relationship("User", foreign_keys=[coach_id], back_populates="coach_relationships")
    client = relationship("User", foreign_keys=[client_id], back_populates="client_relationships")
    invitation = relationship("Invitation", foreign_keys=[invitation_id])
    
    def __repr__(self):
        return f"<CoachClientRelationship coach={self.coach_id} client={self.client_id}>"