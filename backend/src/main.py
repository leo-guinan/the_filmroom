from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import uuid
import time
from typing import AsyncGenerator
import os

from src.core import settings, setup_logging, get_logger
from src.api import health_router, auth_router, users_router, sessions_router
from src.api.video import router as video_router

# Set up logging
setup_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    """Handle application startup and shutdown."""
    # Startup
    logger.info(
        "Starting application",
        app_name=settings.app_name,
        environment=settings.app_env,
        debug=settings.debug,
        database_configured=bool(os.getenv("DATABASE_URL")),
    )
    
    # TODO: Initialize database connection pool
    # TODO: Initialize Redis connection
    # TODO: Initialize LiveKit client
    
    yield
    
    # Shutdown
    logger.info("Shutting down application")
    # TODO: Close database connections
    # TODO: Close Redis connections


app = FastAPI(
    title=settings.app_name,
    description="Secure coaching platform with AI-powered insights",
    version="0.1.0",
    lifespan=lifespan,
    debug=settings.debug,
)

# Parse CORS origins from environment or settings
cors_origins = os.getenv('CORS_ORIGINS', '')
if cors_origins:
    # If CORS_ORIGINS env var is set, use it
    allowed_origins = [origin.strip() for origin in cors_origins.split(',')]
else:
    # Otherwise use settings
    allowed_origins = settings.cors_origins

# In production, ensure we have the custom domains
if settings.app_env == "production":
    # Add all possible frontend origins
    production_origins = [
        "https://filmroom.leoasaservice.com",
        "https://coachapi.leoasaservice.com",
        "https://d2i2sf9vq7cc6e.cloudfront.net",
        "https://d1wbmmojehnr8o.cloudfront.net", 
        "http://localhost:3000"
    ]
    # Merge with configured origins
    for origin in production_origins:
        if origin not in allowed_origins:
            allowed_origins.append(origin)

logger.info(f"CORS Origins configured: {allowed_origins}")

# CORS middleware - must be added before other middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
    expose_headers=["*"],
)


# Add CORS headers middleware with OPTIONS handling
@app.middleware("http")
async def add_cors_headers(request: Request, call_next):
    """Ensure CORS headers are added to all responses and handle OPTIONS."""
    origin = request.headers.get("origin")
    
    # Handle OPTIONS requests directly
    if request.method == "OPTIONS":
        allowed_origins = [
            "https://filmroom.leoasaservice.com",
            "https://coachapi.leoasaservice.com",
            "https://d2i2sf9vq7cc6e.cloudfront.net",
            "https://d1wbmmojehnr8o.cloudfront.net",
            "http://localhost:3000"
        ]
        
        headers = {
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept, Origin, X-Requested-With",
            "Access-Control-Max-Age": "3600",
            "Access-Control-Allow-Credentials": "true"
        }
        
        if origin in allowed_origins:
            headers["Access-Control-Allow-Origin"] = origin
        else:
            headers["Access-Control-Allow-Origin"] = "https://filmroom.leoasaservice.com"
            
        return JSONResponse(status_code=200, content={}, headers=headers)
    
    # Process non-OPTIONS requests
    response = await call_next(request)
    
    # Add CORS headers if origin is present
    if origin:
        allowed_origins = [
            "https://filmroom.leoasaservice.com",
            "https://coachapi.leoasaservice.com",
            "https://d2i2sf9vq7cc6e.cloudfront.net",
            "https://d1wbmmojehnr8o.cloudfront.net",
            "http://localhost:3000"
        ]
        
        if origin in allowed_origins:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Accept, Origin, X-Requested-With"
    
    return response

# Request ID middleware
@app.middleware("http")
async def add_request_id(request: Request, call_next):
    """Add unique request ID to each request for tracing."""
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    
    # Bind to logging context
    from src.core.logging import bind_request_id, clear_contextvars
    bind_request_id(request_id)
    
    start_time = time.time()
    
    response = await call_next(request)
    
    process_time = time.time() - start_time
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time"] = str(process_time)
    
    logger.info(
        "Request completed",
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        process_time=process_time,
    )
    
    clear_contextvars()
    return response


# Exception handlers
@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    """Handle 404 errors."""
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={
            "detail": "Resource not found",
            "path": str(request.url.path),
            "request_id": getattr(request.state, "request_id", None),
        },
    )


@app.exception_handler(500)
async def internal_error_handler(request: Request, exc):
    """Handle 500 errors."""
    request_id = getattr(request.state, "request_id", None)
    logger.error(
        "Internal server error",
        request_id=request_id,
        path=str(request.url.path),
        exc_info=exc,
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "Internal server error",
            "request_id": request_id,
        },
    )


# Include routers
app.include_router(health_router, tags=["health"])
app.include_router(auth_router, prefix=f"/api/{settings.api_version}/auth", tags=["auth"])
app.include_router(users_router, prefix=f"/api/{settings.api_version}/users", tags=["users"])
app.include_router(sessions_router, prefix=f"/api/{settings.api_version}/sessions", tags=["sessions"])
app.include_router(video_router, prefix=f"/api/{settings.api_version}/video", tags=["video"])


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "app": settings.app_name,
        "version": "0.1.0",
        "environment": settings.app_env,
        "api_version": settings.api_version,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.api_port,
        reload=settings.is_development,
        log_level=settings.log_level.lower(),
        workers=1 if settings.is_development else 4,
    )