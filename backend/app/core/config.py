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

    # ---- Staff (police / admin) access control -------------------------
    # Officer self-registration is DISABLED unless a code is configured.
    # Empty string means the endpoint refuses every request (fail closed),
    # so the only way to create staff accounts is an existing administrator.
    OFFICER_REGISTRATION_CODE: str = ""

    # Police and admin sign-in requires a TOTP authenticator app. Accounts
    # that have not enrolled yet are sent through enrollment before they get
    # a usable session token.
    REQUIRE_MFA_FOR_STAFF: bool = True
    MFA_ISSUER: str = "CyberAid"

    # Staff sessions are shorter-lived than citizen sessions.
    STAFF_TOKEN_EXPIRE_MINUTES: int = 30
    MFA_ENROLLMENT_TOKEN_MINUTES: int = 10

    # Brute-force protection (applies to every account).
    MAX_FAILED_LOGINS: int = 5
    LOCKOUT_MINUTES: int = 15

    # Minimum password length; staff accounts are held to a longer minimum.
    MIN_PASSWORD_LENGTH: int = 8
    MIN_STAFF_PASSWORD_LENGTH: int = 12

    # AI
    GEMINI_API_KEY: str = ""

    # Graph DB (used from Day 5 onward)
    NEO4J_URI: str = ""
    NEO4J_USER: str = ""
    NEO4J_PASSWORD: str = ""


# Instantiated once, imported everywhere else via `from app.core.config import settings`
settings = Settings()
