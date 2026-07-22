"""
Centralized app configuration.

Why: FastAPI apps tend to scatter `os.getenv()` calls everywhere, which makes
it hard to know what env vars exist and easy to typo a key name. pydantic-settings
gives us one typed object, loaded once, validated at startup (fails fast if
something required is missing).
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    APP_NAME: str = "CyberShield AI"
    ENVIRONMENT: str = "development"

    # Database
    DATABASE_URL: str

    # Auth
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # AI
    GEMINI_API_KEY: str = ""

    # Graph DB (used from Day 5 onward)
    NEO4J_URI: str = ""
    NEO4J_USER: str = ""
    NEO4J_PASSWORD: str = ""


# Instantiated once, imported everywhere else via `from app.core.config import settings`
settings = Settings()
