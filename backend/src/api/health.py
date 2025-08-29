from fastapi import APIRouter, status
from typing import Dict, Any
from datetime import datetime

from src.core import get_logger

router = APIRouter()
logger = get_logger(__name__)


@router.get("/health", status_code=status.HTTP_200_OK)
async def health_check() -> Dict[str, Any]:
    """Basic health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/health/ready", status_code=status.HTTP_200_OK)
async def readiness_check() -> Dict[str, Any]:
    """
    Readiness check endpoint.
    Checks if the application is ready to serve requests.
    """
    checks = {
        "database": False,  # TODO: Check database connection
        "redis": False,     # TODO: Check Redis connection
        "livekit": False,   # TODO: Check LiveKit connection
    }
    
    all_ready = all(checks.values())
    
    response = {
        "status": "ready" if all_ready else "not_ready",
        "checks": checks,
        "timestamp": datetime.utcnow().isoformat(),
    }
    
    if not all_ready:
        logger.warning("Readiness check failed", checks=checks)
        return response
    
    return response


@router.get("/health/live", status_code=status.HTTP_200_OK)
async def liveness_check() -> Dict[str, str]:
    """
    Liveness check endpoint.
    Simple check to verify the application is running.
    """
    return {"status": "alive"}