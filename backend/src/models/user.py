from sqlalchemy import Column, String, Boolean, DateTime, Enum, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
import uuid

from .base import Base


class UserRole(str, enum.Enum):
    COACH = "coach"
    CLIENT = "client"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.CLIENT)
    
    # Profile fields
    phone = Column(String, nullable=True)
    timezone = Column(String, default="UTC")
    bio = Column(Text, nullable=True)
    avatar_url = Column(String, nullable=True)
    
    # Status fields
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    last_login_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    coach_sessions = relationship("Session", foreign_keys="Session.coach_id", back_populates="coach")
    client_sessions = relationship("Session", foreign_keys="Session.client_id", back_populates="client")
    client_profiles = relationship("ClientProfile", foreign_keys="ClientProfile.client_id", back_populates="client")
    coach_profiles = relationship("ClientProfile", foreign_keys="ClientProfile.coach_id", back_populates="coach")
    notes_written = relationship("ClientNote", back_populates="author")
    
    def __repr__(self):
        return f"<User {self.email} ({self.role})>"
    
    @property
    def is_coach(self):
        return self.role == UserRole.COACH
    
    @property
    def is_client(self):
        return self.role == UserRole.CLIENT
    
    @property
    def is_admin(self):
        return self.role == UserRole.ADMIN