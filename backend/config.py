"""
Configuration Management for PhishGuard API

Environment-based configuration with secure defaults.
"""

import os
from dataclasses import dataclass
from typing import Literal


@dataclass(frozen=True)
class SecurityConfig:
    """Security-related configuration."""
    max_request_size: int
    max_text_length: int
    rate_limit_requests: int
    rate_limit_window: int
    enable_rate_limiting: bool
    allowed_origins: list[str]


@dataclass(frozen=True)
class AppConfig:
    """Application configuration."""
    environment: Literal["development", "production", "testing"]
    debug: bool
    host: str
    port: int
    log_level: str
    security: SecurityConfig


def get_config() -> AppConfig:
    """
    Load configuration from environment variables with secure defaults.
    
    Environment variables:
    - FLASK_ENV: development|production|testing (default: development)
    - FLASK_DEBUG: 1|0 (default: 0)
    - HOST: Bind host (default: 127.0.0.1)
    - PORT: Bind port (default: 5000)
    - LOG_LEVEL: DEBUG|INFO|WARNING|ERROR (default: INFO)
    - MAX_REQUEST_SIZE: Max request size in MB (default: 1)
    - MAX_TEXT_LENGTH: Max email text length (default: 100000)
    - RATE_LIMIT: Max requests per window (default: 30)
    - RATE_LIMIT_WINDOW: Window in seconds (default: 60)
    - ALLOWED_ORIGINS: Comma-separated CORS origins
    """
    
    env = os.getenv("FLASK_ENV", "development")
    is_production = env == "production"
    
    # Security defaults - stricter in production
    max_request_mb = int(os.getenv("MAX_REQUEST_SIZE", "1"))
    max_text_length = int(os.getenv("MAX_TEXT_LENGTH", "100000"))
    rate_limit = int(os.getenv("RATE_LIMIT", "30"))
    rate_limit_window = int(os.getenv("RATE_LIMIT_WINDOW", "60"))
    
    # CORS origins
    allowed_origins_str = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:*,http://127.0.0.1:*" if not is_production else ""
    )
    allowed_origins = [o.strip() for o in allowed_origins_str.split(",") if o.strip()]
    
    security = SecurityConfig(
        max_request_size=max_request_mb * 1024 * 1024,
        max_text_length=max_text_length,
        rate_limit_requests=rate_limit,
        rate_limit_window=rate_limit_window,
        enable_rate_limiting=True,
        allowed_origins=allowed_origins
    )
    
    return AppConfig(
        environment=env,  # type: ignore
        debug=os.getenv("FLASK_DEBUG", "0") == "1" and not is_production,
        host=os.getenv("HOST", "127.0.0.1" if is_production else "0.0.0.0"),
        port=int(os.getenv("PORT", "5000")),
        log_level=os.getenv("LOG_LEVEL", "INFO"),
        security=security
    )


# Global config instance
config = get_config()
