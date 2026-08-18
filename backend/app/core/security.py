"""
Password hashing + JWT token creation/verification.

Why passlib+bcrypt: industry standard for password hashing, resistant to
rainbow table / brute force attacks (unlike storing plain SHA256 hashes).
Why python-jose for JWT: lightweight, well-maintained, works cleanly with
FastAPI's OAuth2PasswordBearer pattern.
"""

from datetime import datetime, timedelta, timezone

import pyotp
from jose import jwt, JWTError
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_minutes: int | None = None) -> str:
    """
    Creates a signed JWT containing `data` (typically {"sub": user_id, "role": role})
    plus an expiry claim. Signed with SECRET_KEY so the token can't be tampered with
    without invalidating the signature.

    `expires_minutes` lets callers shorten the lifetime — staff sessions are
    deliberately shorter than citizen sessions.
    """
    to_encode = data.copy()
    minutes = expires_minutes or settings.ACCESS_TOKEN_EXPIRE_MINUTES
    expire = datetime.now(timezone.utc) + timedelta(minutes=minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


# Scope marker for the short-lived token handed out during MFA enrollment.
# Tokens carrying this scope are accepted ONLY by the enrollment endpoints —
# get_current_user rejects them, so a half-authenticated officer can never use
# one to reach case data.
MFA_ENROLL_SCOPE = "mfa_enroll"


def create_mfa_enrollment_token(user_id: str) -> str:
    """
    Issued after a correct password when a staff account still has to enrol in
    two-factor auth. Short-lived and scope-limited on purpose.
    """
    return create_access_token(
        {"sub": str(user_id), "scope": MFA_ENROLL_SCOPE},
        expires_minutes=settings.MFA_ENROLLMENT_TOKEN_MINUTES,
    )


# ---- TOTP (RFC 6238) two-factor -----------------------------------------


def generate_totp_secret() -> str:
    """Fresh base32 secret for an authenticator app."""
    return pyotp.random_base32()


def totp_provisioning_uri(secret: str, email: str) -> str:
    """
    otpauth:// URI that Google Authenticator / Authy / Microsoft Authenticator
    read from a QR code.
    """
    return pyotp.TOTP(secret).provisioning_uri(name=email, issuer_name=settings.MFA_ISSUER)


def verify_totp(secret: str, code: str) -> bool:
    """
    Validates a 6-digit code. `valid_window=1` accepts the adjacent 30s step so
    a slightly out-of-sync phone clock doesn't lock an officer out.
    """
    if not secret or not code:
        return False
    try:
        return pyotp.TOTP(secret).verify(str(code).strip().replace(" ", ""), valid_window=1)
    except Exception:
        return False


def decode_access_token(token: str) -> dict | None:
    """Returns the decoded payload, or None if the token is invalid/expired."""
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None
