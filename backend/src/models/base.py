from typing import AsyncGenerator
from sqlalchemy import create_engine, MetaData
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import NullPool
from contextlib import contextmanager

from src.core import settings, get_logger
import os

logger = get_logger(__name__)

# Database URL configuration
# Try to get from environment first, then fall back to settings
DATABASE_URL = os.getenv("DATABASE_URL") or settings.database_url

# Fix postgres:// to postgresql:// for SQLAlchemy compatibility
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

logger.info(f"Database URL configured: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else DATABASE_URL}")

# Create engine
if settings.is_development:
    # Use NullPool for development to avoid connection issues
    engine = create_engine(
        DATABASE_URL,
        echo=settings.database_echo,
        pool_pre_ping=True,
        poolclass=NullPool,
    )
else:
    # Use connection pooling in production
    engine = create_engine(
        DATABASE_URL,
        echo=settings.database_echo,
        pool_size=settings.database_pool_size,
        max_overflow=settings.database_max_overflow,
        pool_pre_ping=True,
    )

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class for models
metadata = MetaData()
Base = declarative_base(metadata=metadata)


def get_db() -> Session:
    """
    Dependency to get database session.
    Use with FastAPI's Depends.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_db_context():
    """
    Context manager for database session.
    Use for scripts and background tasks.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database tables."""
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")
        raise