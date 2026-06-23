"""
Centralized configuration — all secrets/settings via environment variables.
Never hardcode secrets. Use .env for local dev, env vars in production.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ── Database ──
    DATABASE_URL: str = "sqlite:///./recruitment_os.db"

    # ── Security ──
    JWT_SECRET_KEY: str = "CHANGE-ME-IN-PRODUCTION-use-openssl-rand-hex-32"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── AI (Groq — OpenAI-compatible) ──
    OPENAI_API_KEY: str = "sk-placeholder"
    OPENAI_BASE_URL: str = "https://api.groq.com/openai/v1"
    OPENAI_MODEL: str = "llama-3.1-8b-instant"

    # ── Email (Gmail SMTP) ──
    GMAIL_USER: str = ""
    GMAIL_APP_PASSWORD: str = ""
    EMAIL_FROM: str = "HireOS <aaronarora4689@gmail.com>"

    # ── CORS ──
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:3000",
    ]

    # ── Rate Limiting ──
    RATE_LIMIT_AUTH: str = "10/minute"
    RATE_LIMIT_AI: str = "20/minute"
    RATE_LIMIT_UPLOAD: str = "10/hour"
    RATE_LIMIT_DEFAULT: str = "60/minute"

    # ── Environment ──
    ENVIRONMENT: str = "development"
    DEBUG: bool = False

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
