"""
Password hashing + JWT token creation/verification.

Why passlib+bcrypt: industry standard for password hashing, resistant to
rainbow table / brute force attacks (unlike storing plain SHA256 hashes).
Why python-jose for JWT: lightweight, well-maintained, works cleanly with
FastAPI's OAuth2PasswordBearer pattern.
"""

from datetime import datetime, timedelta, timezone

from jose import jwt, JWTError
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict) -> str:
    """
    Creates a signed JWT containing `data` (typically {"sub": user_id, "role": role})
    plus an expiry claim. Signed with SECRET_KEY so the token can't be tampered with
    without invalidating the signature.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> dict | None:
    """Returns the decoded payload, or None if the token is invalid/expired."""
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None
