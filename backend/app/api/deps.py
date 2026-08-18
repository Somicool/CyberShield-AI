"""
Shared FastAPI dependencies — currently: extracting the current user from a JWT.

Usage in a route:
    @router.get("/me")
    def read_me(current_user: User = Depends(get_current_user)):
        ...
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import MFA_ENROLL_SCOPE, decode_access_token
from app.db.session import get_db
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_error

    # An MFA-enrollment token proves the password only. It must never be
    # accepted as a session token, or the second factor would be optional.
    if payload.get("scope") == MFA_ENROLL_SCOPE:
        raise credentials_error

    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_error

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_error

    # An account disabled after the token was issued loses access immediately,
    # rather than staying valid until the token expires.
    if user.is_active is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been disabled. Contact an administrator.",
        )

    return user


def get_enrolling_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Accepts ONLY the short-lived enrollment token issued by /login when a staff
    account still has to set up two-factor auth. Used by the /mfa/setup and
    /mfa/enable endpoints so enrollment can finish without a full session.
    """
    error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Enrollment session expired. Sign in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    if payload is None or payload.get("scope") != MFA_ENROLL_SCOPE:
        raise error

    user = db.query(User).filter(User.id == payload.get("sub")).first()
    if user is None or user.is_active is False:
        raise error
    return user


def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    """
    Requires the caller to be an authenticated administrator. Used to guard
    all /api/admin routes. Reuses the existing JWT + role model.
    """
    from app.models.user import UserRole

    if current_user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required",
        )
    return current_user


def get_current_police(current_user: User = Depends(get_current_user)) -> User:
    """
    Requires the caller to be a police officer (or an administrator, who
    outranks police). Guards the CrimeGPT legal-tooling routes, which are for
    law-enforcement use only. Reuses the existing JWT + role model.
    """
    from app.models.user import UserRole

    if current_user.role not in (UserRole.police, UserRole.admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Police access required",
        )
    return current_user


def get_current_user_optional(
    token: str | None = Depends(OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)),
    db: Session = Depends(get_db),
) -> User | None:
    """
    Like get_current_user, but returns None instead of raising 401 when no
    token is provided. Used for routes that should work for both logged-in
    users and anonymous citizens (e.g. detection — anyone should be able to
    check a suspicious URL without an account).
    """
    if token is None:
        return None

    payload = decode_access_token(token)
    if payload is None:
        return None

    user_id = payload.get("sub")
    if user_id is None:
        return None

    return db.query(User).filter(User.id == user_id).first()
