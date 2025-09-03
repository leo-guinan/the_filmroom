from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, JSON, Enum, Float
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
import uuid

from .base import Base


class SessionStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"


class Session(Base):
    __tablename__ = "sessions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Basic information
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    scheduled_at = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer, nullable=False, default=60)
    status = Column(Enum(SessionStatus), nullable=False, default=SessionStatus.SCHEDULED)
    
    # LiveKit integration
    room_name = Column(String, nullable=True, unique=True, index=True)
    room_sid = Column(String, nullable=True)  # LiveKit room session ID
    recording_url = Column(String, nullable=True)
    
    # Cal.com integration
    cal_booking_id = Column(String, nullable=True)
    
    # Participants
    coach_id = Column(String, ForeignKey("users.id"), nullable=False)
    client_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    # Session timing
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    actual_duration_minutes = Column(Integer, nullable=True)
    
    # Cal.com integration
    cal_booking_id = Column(String, nullable=True, index=True)
    cal_event_type_id = Column(String, nullable=True)
    
    # Session metadata
    session_metadata = Column(JSON, nullable=True)  # For storing additional session data
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    coach = relationship("User", foreign_keys=[coach_id], back_populates="coach_sessions")
    client = relationship("User", foreign_keys=[client_id], back_populates="client_sessions")
    transcription = relationship("SessionTranscription", back_populates="session", uselist=False)
    insights = relationship("SessionInsight", back_populates="session", uselist=False)
    notes = relationship("ClientNote", back_populates="session")
    
    def __repr__(self):
        return f"<Session {self.title} - {self.status}>"
    
    @property
    def is_active(self):
        return self.status == SessionStatus.IN_PROGRESS
    
    @property
    def is_completed(self):
        return self.status == SessionStatus.COMPLETED


class SessionTranscription(Base):
    __tablename__ = "session_transcriptions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, ForeignKey("sessions.id"), nullable=False, unique=True)
    
    # Transcription data
    raw_transcription = Column(Text, nullable=False)
    formatted_transcription = Column(Text, nullable=True)  # With speaker labels and timestamps
    
    # Processing metadata
    processing_started_at = Column(DateTime, nullable=True)
    processing_completed_at = Column(DateTime, nullable=True)
    processing_duration_seconds = Column(Float, nullable=True)
    transcription_engine = Column(String, nullable=True)  # e.g., "whisper", "deepgram"
    
    # Speaker diarization
    speakers = Column(JSON, nullable=True)  # [{"speaker_id": "1", "label": "Coach", "segments": [...]}]
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    session = relationship("Session", back_populates="transcription")
    
    def __repr__(self):
        return f"<SessionTranscription for session {self.session_id}>"


class SessionInsight(Base):
    __tablename__ = "session_insights"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, ForeignKey("sessions.id"), nullable=False, unique=True)
    
    # AI-generated insights
    summary = Column(Text, nullable=False)
    key_topics = Column(JSON, nullable=True)  # ["topic1", "topic2", ...]
    action_items = Column(JSON, nullable=True)  # [{"item": "...", "assignee": "coach/client"}]
    
    # Sentiment analysis
    overall_sentiment = Column(String, nullable=True)  # "positive", "neutral", "negative"
    sentiment_scores = Column(JSON, nullable=True)  # {"positive": 0.7, "neutral": 0.2, "negative": 0.1}
    emotional_moments = Column(JSON, nullable=True)  # Timestamps of significant emotional moments
    
    # Progress tracking
    goals_discussed = Column(JSON, nullable=True)
    progress_indicators = Column(JSON, nullable=True)
    challenges_identified = Column(JSON, nullable=True)
    breakthroughs = Column(JSON, nullable=True)
    
    # Coach insights
    suggested_followups = Column(JSON, nullable=True)
    client_engagement_score = Column(Float, nullable=True)  # 0-100
    session_effectiveness_score = Column(Float, nullable=True)  # 0-100
    
    # Processing metadata
    ai_model = Column(String, nullable=True)  # e.g., "gpt-4", "claude-3"
    processing_completed_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    session = relationship("Session", back_populates="insights")
    
    def __repr__(self):
        return f"<SessionInsight for session {self.session_id}>"