from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, validator
import os


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Application
    app_name: str = Field(default="The Film Room")
    app_env: str = Field(default="development")
    debug: bool = Field(default=False)
    api_port: int = Field(default=8000)
    api_version: str = Field(default="v1")
    
    # Database
    database_url: str = Field(
        default="postgresql://filmroom:filmroom@localhost:5432/filmroom_db"
    )
    database_pool_size: int = Field(default=20)
    database_max_overflow: int = Field(default=40)
    database_echo: bool = Field(default=False)
    
    # Security
    secret_key: str = Field(default="change-this-secret-key-in-production")
    jwt_algorithm: str = Field(default="HS256")
    jwt_expiration_hours: int = Field(default=24)
    password_min_length: int = Field(default=8)
    
    # CORS
    cors_origins: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:3001"]
    )
    cors_allow_credentials: bool = Field(default=True)
    cors_allow_methods: List[str] = Field(default=["*"])
    cors_allow_headers: List[str] = Field(default=["*"])
    
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

    @validator("cors_origins", pre=True)
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v

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