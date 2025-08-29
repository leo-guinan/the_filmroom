from typing import List, Optional, Any
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, validator, field_validator
import os


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False
    )

    # Application
    app_name: str = Field(default="The Film Room")
    app_env: str = Field(default="development", env="APP_ENV")
    debug: bool = Field(default=False)
    api_port: int = Field(default=8000)
    api_version: str = Field(default="v1")
    
    # Database
    database_url: str = Field(
        default="postgresql://filmroom:filmroom@localhost:5432/filmroom_db",
        env="DATABASE_URL"
    )
    database_pool_size: int = Field(default=20)
    database_max_overflow: int = Field(default=40)
    database_echo: bool = Field(default=False)
    
    # Security
    secret_key: str = Field(default="change-this-secret-key-in-production", env="SECRET_KEY")
    jwt_algorithm: str = Field(default="HS256")
    jwt_expiration_hours: int = Field(default=24)
    password_min_length: int = Field(default=8)
    
    # CORS - handle as string to avoid JSON parsing issues
    cors_origins_str: str = Field(
        default="http://localhost:3000,http://localhost:3001",
        env="CORS_ORIGINS"
    )
    cors_allow_credentials: bool = Field(default=True)
    cors_allow_methods_str: str = Field(default="GET,POST,PUT,DELETE,OPTIONS,PATCH", env="CORS_ALLOW_METHODS")
    cors_allow_headers_str: str = Field(default="*", env="CORS_ALLOW_HEADERS")
    
    # LiveKit
    livekit_api_key: str = Field(default="devkey")
    livekit_api_secret: str = Field(default="secret")
    livekit_url: str = Field(default="ws://localhost:7880")
    
    # Redis
    redis_url: str = Field(default="redis://localhost:6379/0")
    
    # AI Services
    openai_api_key: Optional[str] = Field(default=None)
    anthropic_api_key: Optional[str] = Field(default=None)
    
    # Email
    email_enabled: bool = Field(default=False)
    email_from: str = Field(default="noreply@thefilmroom.com")
    sendgrid_api_key: Optional[str] = Field(default=None)
    
    # Logging
    log_level: str = Field(default="INFO")
    log_format: str = Field(default="json")
    
    # File Storage
    aws_access_key_id: Optional[str] = Field(default=None)
    aws_secret_access_key: Optional[str] = Field(default=None)
    aws_s3_bucket: str = Field(default="filmroom-recordings")
    aws_region: str = Field(default="us-east-1")
    
    @property
    def cors_origins(self) -> List[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.cors_origins_str.split(",") if origin.strip()]
    
    @property
    def cors_allow_methods(self) -> List[str]:
        """Parse CORS methods from comma-separated string."""
        if self.cors_allow_methods_str == "*":
            return ["*"]
        return [method.strip() for method in self.cors_allow_methods_str.split(",") if method.strip()]
    
    @property
    def cors_allow_headers(self) -> List[str]:
        """Parse CORS headers from comma-separated string."""
        if self.cors_allow_headers_str == "*":
            return ["*"]
        return [header.strip() for header in self.cors_allow_headers_str.split(",") if header.strip()]

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def is_development(self) -> bool:
        return self.app_env == "development"

    @property
    def database_url_async(self) -> str:
        return self.database_url.replace("postgresql://", "postgresql+asyncpg://")


settings = Settings()

# Debug logging for database configuration
import os
if os.getenv("DATABASE_URL"):
    print(f"DATABASE_URL environment variable found: {os.getenv('DATABASE_URL').split('@')[1] if '@' in os.getenv('DATABASE_URL') else 'invalid format'}")
else:
    print(f"DATABASE_URL not found in environment, using default: {settings.database_url.split('@')[1] if '@' in settings.database_url else settings.database_url}")