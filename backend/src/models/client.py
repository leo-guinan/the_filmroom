from sqlalchemy import Column, String, Text, DateTime, ForeignKey, JSON, Integer, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from .base import Base


class ClientProfile(Base):
    __tablename__ = "client_profiles"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Relationships
    client_id = Column(String, ForeignKey("users.id"), nullable=False)
    coach_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    # Profile information
    coaching_goals = Column(Text, nullable=True)
    background_info = Column(Text, nullable=True)
    preferences = Column(JSON, nullable=True)  # {"session_frequency": "weekly", "preferred_time": "morning", ...}
    
    # Progress tracking
    initial_assessment = Column(Text, nullable=True)
    current_challenges = Column(JSON, nullable=True)
    achievements = Column(JSON, nullable=True)
    
    # Engagement metrics
    total_sessions = Column(Integer, default=0)
    completed_sessions = Column(Integer, default=0)
    last_session_date = Column(DateTime, nullable=True)
    next_session_date = Column(DateTime, nullable=True)
    
    # Custom fields for coach-specific tracking
    custom_fields = Column(JSON, nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    paused_at = Column(DateTime, nullable=True)
    paused_reason = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    client = relationship("User", foreign_keys=[client_id], back_populates="client_profiles")
    coach = relationship("User", foreign_keys=[coach_id], back_populates="coach_profiles")
    notes = relationship("ClientNote", back_populates="client_profile")
    
    def __repr__(self):
        return f"<ClientProfile {self.client_id} with coach {self.coach_id}>"


class ClientNote(Base):
    __tablename__ = "client_notes"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Relationships
    client_profile_id = Column(String, ForeignKey("client_profiles.id"), nullable=False)
    session_id = Column(String, ForeignKey("sessions.id"), nullable=True)  # Optional, can be session-specific
    author_id = Column(String, ForeignKey("users.id"), nullable=False)  # The coach who wrote the note
    
    # Note content
    content = Column(Text, nullable=False)
    note_type = Column(String, nullable=True)  # "observation", "progress", "concern", "breakthrough"
    
    # Privacy settings
    is_private = Column(Boolean, default=True)  # If false, can be shared with client
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    client_profile = relationship("ClientProfile", back_populates="notes")
    session = relationship("Session", back_populates="notes")
    author = relationship("User", back_populates="notes_written")
    
    def __repr__(self):
        return f"<ClientNote {self.id} by {self.author_id}>"