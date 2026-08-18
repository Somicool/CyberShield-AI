"""
Auth routes: registration, sign-in, and two-factor enrollment.

Access model
------------
Citizens self-register freely. Police and administrator accounts are
privileged, so they are protected by three separate controls:

1. `POST /signup` can ONLY ever create a citizen. The role is not taken from
   the request body — accepting it previously allowed anyone to register
   themselves as police or admin.
2. `POST /signup/officer` requires the department registration code
   (OFFICER_REGISTRATION_CODE). If that code is not configured the endpoint
   refuses every request, so the only remaining way to create staff accounts
   is an existing administrator.
3. Staff sign-in requires a TOTP code from an authenticator app. Accounts that
   have not enrolled are handed a short-lived, scope-limited enrollment token
   instead of a session.

Every account is additionally protected by a failed-attempt lockout, and every
sign-in attempt is logged (never the password).

Login uses OAuth2PasswordRequestForm (form fields: username, password) because
that's what FastAPI's OAuth2PasswordBearer/Swagger UI expects by default —
we map the "username" field to email. The optional `otp` form field carries the
second factor.
"""

import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Form, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_enrolling_user
from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_mfa_enrollment_token,
    generate_totp_secret,
    hash_password,
    totp_provisioning_uri,
    verify_password,
    verify_totp,
)
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.user import (
    LoginResponse,
    MfaCode,
    MfaDisable,
    MfaSetupOut,
    OfficerCreate,
    Token,
    UserCreate,
    UserOut,
)

logger = logging.getLogger("cybershield.auth")

router = APIRouter(prefix="/api/auth", tags=["auth"])

STAFF_ROLES = (UserRole.police, UserRole.admin)


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def _utcnow() -> datetime:
    """
    Naive UTC timestamp.

    `users.locked_until` / `users.last_login` are TIMESTAMP WITHOUT TIME ZONE
    columns. Handing the driver a tz-aware value made it store local wall time
    (UTC+5:30 here) which was then read back as if it were UTC — a 15 minute
    lockout reported itself as 345 minutes. Everything written to and compared
    against those columns is naive UTC.
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _as_naive_utc(value: datetime) -> datetime:
    """Normalises a value read from the DB (which may be either) to naive UTC."""
    if value.tzinfo is not None:
        return value.astimezone(timezone.utc).replace(tzinfo=None)
    return value


def _require_password_strength(password: str, *, staff: bool) -> None:
    minimum = settings.MIN_STAFF_PASSWORD_LENGTH if staff else settings.MIN_PASSWORD_LENGTH
    if len(password or "") < minimum:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Password must be at least {minimum} characters.",
        )


def _register(db: Session, payload: UserCreate, role: UserRole) -> User:
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    _require_password_strength(payload.password, staff=role in STAFF_ROLES)

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/me", response_model=UserOut)
def read_me(current_user: User = Depends(get_current_user)):
    """Returns the authenticated user's profile (used by the Citizen Portal)."""
    return current_user


@router.post("/signup", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def signup(payload: UserCreate, db: Session = Depends(get_db)):
    """
    Public self-registration — always creates a CITIZEN account.

    The role is hardcoded rather than read from the request, so this endpoint
    cannot be used to obtain police or administrator access.
    """
    user = _register(db, payload, UserRole.citizen)
    logger.info("citizen registered: %s", user.email)
    return user


@router.post("/signup/officer", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def signup_officer(payload: OfficerCreate, request: Request, db: Session = Depends(get_db)):
    """
    Officer registration, gated by the department registration code.

    Fails closed: if OFFICER_REGISTRATION_CODE is not set, no one can register
    an officer account through the API at all.
    """
    expected = settings.OFFICER_REGISTRATION_CODE
    if not expected:
        logger.warning("officer registration attempted while disabled from %s", _client_ip(request))
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Officer registration is disabled. An administrator must create your account.",
        )

    # Constant-time-ish comparison; the codes are short so this is adequate.
    import secrets as _secrets

    if not _secrets.compare_digest(str(payload.access_code), str(expected)):
        logger.warning(
            "officer registration rejected (bad code) for %s from %s",
            payload.email,
            _client_ip(request),
        )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid department access code.")

    user = _register(db, payload, UserRole.police)
    logger.info("officer registered: %s from %s", user.email, _client_ip(request))
    return user


@router.post("/login", response_model=LoginResponse)
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    otp: str | None = Form(None, description="6-digit authenticator code (police/admin)"),
    db: Session = Depends(get_db),
):
    ip = _client_ip(request)
    user = db.query(User).filter(User.email == form_data.username).first()

    # Same response whether the email is unknown or the password is wrong, so
    # the endpoint can't be used to enumerate valid accounts.
    invalid = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect email or password",
    )

    if user is None:
        logger.warning("login failed (unknown email) for %s from %s", form_data.username, ip)
        raise invalid

    now = _utcnow()

    # ---- lockout -------------------------------------------------------
    if user.locked_until is not None:
        locked_until = _as_naive_utc(user.locked_until)
        if locked_until > now:
            remaining = int((locked_until - now).total_seconds() // 60) + 1
            logger.warning("login blocked (locked) for %s from %s", user.email, ip)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many failed attempts. Try again in {remaining} minute(s).",
            )

    # ---- password ------------------------------------------------------
    if not verify_password(form_data.password, user.hashed_password):
        user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
        if user.failed_login_attempts >= settings.MAX_FAILED_LOGINS:
            user.locked_until = now + timedelta(minutes=settings.LOCKOUT_MINUTES)
            user.failed_login_attempts = 0
            logger.warning(
                "account locked after %s failed attempts: %s from %s",
                settings.MAX_FAILED_LOGINS,
                user.email,
                ip,
            )
        else:
            logger.warning(
                "login failed (bad password %s/%s) for %s from %s",
                user.failed_login_attempts,
                settings.MAX_FAILED_LOGINS,
                user.email,
                ip,
            )
        db.add(user)
        db.commit()
        raise invalid

    # Disabled accounts (set by an administrator) cannot authenticate.
    if user.is_active is False:
        logger.warning("login blocked (disabled account) for %s from %s", user.email, ip)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been disabled. Contact an administrator.",
        )

    is_staff = user.role in STAFF_ROLES

    # ---- second factor for police / admin ------------------------------
    if is_staff and user.mfa_enabled:
        if not otp:
            # Password was correct but the session is withheld until the
            # second factor is supplied. The frontend matches on this detail.
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="mfa_required",
            )
        if not verify_totp(user.totp_secret, otp):
            user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
            if user.failed_login_attempts >= settings.MAX_FAILED_LOGINS:
                user.locked_until = now + timedelta(minutes=settings.LOCKOUT_MINUTES)
                user.failed_login_attempts = 0
            db.add(user)
            db.commit()
            logger.warning("login failed (bad 2FA code) for %s from %s", user.email, ip)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authenticator code.",
            )

    elif is_staff and settings.REQUIRE_MFA_FOR_STAFF:
        # Correct password, but this officer has never enrolled. Hand back an
        # enrollment-scoped token only — it cannot read any case data.
        user.failed_login_attempts = 0
        db.add(user)
        db.commit()
        logger.info("mfa enrollment required for %s from %s", user.email, ip)
        return LoginResponse(
            mfa_enrollment_required=True,
            enrollment_token=create_mfa_enrollment_token(user.id),
        )

    # ---- success -------------------------------------------------------
    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login = now
    db.add(user)
    db.commit()

    logger.info("login ok: %s (%s) from %s", user.email, user.role.value, ip)
    token = create_access_token(
        data={"sub": str(user.id), "role": user.role.value},
        expires_minutes=settings.STAFF_TOKEN_EXPIRE_MINUTES if is_staff else None,
    )
    return LoginResponse(access_token=token)


# ---- Two-factor enrollment / management ---------------------------------


@router.post("/mfa/setup", response_model=MfaSetupOut)
def mfa_setup(user: User = Depends(get_enrolling_user), db: Session = Depends(get_db)):
    """
    Starts enrollment: generates a fresh secret and returns the otpauth URI for
    the QR code. The secret is stored but NOT trusted until /mfa/enable proves
    the officer can generate a valid code.
    """
    if user.mfa_enabled:
        raise HTTPException(status_code=400, detail="Two-factor authentication is already enabled.")

    user.totp_secret = generate_totp_secret()
    db.add(user)
    db.commit()
    db.refresh(user)

    return MfaSetupOut(
        secret=user.totp_secret,
        otpauth_uri=totp_provisioning_uri(user.totp_secret, user.email),
    )


@router.post("/mfa/enable", response_model=Token)
def mfa_enable(
    payload: MfaCode,
    request: Request,
    user: User = Depends(get_enrolling_user),
    db: Session = Depends(get_db),
):
    """
    Completes enrollment. On success two-factor becomes mandatory for this
    account and a normal session token is issued.
    """
    if user.mfa_enabled:
        raise HTTPException(status_code=400, detail="Two-factor authentication is already enabled.")
    if not user.totp_secret:
        raise HTTPException(status_code=400, detail="Start enrollment first.")
    if not verify_totp(user.totp_secret, payload.code):
        logger.warning("mfa enrollment failed (bad code) for %s from %s", user.email, _client_ip(request))
        raise HTTPException(status_code=400, detail="That code did not match. Try the next one.")

    user.mfa_enabled = True
    user.last_login = _utcnow()
    user.failed_login_attempts = 0
    db.add(user)
    db.commit()

    logger.info("mfa enabled for %s from %s", user.email, _client_ip(request))
    is_staff = user.role in STAFF_ROLES
    return Token(
        access_token=create_access_token(
            data={"sub": str(user.id), "role": user.role.value},
            expires_minutes=settings.STAFF_TOKEN_EXPIRE_MINUTES if is_staff else None,
        )
    )


@router.get("/mfa/status")
def mfa_status(user: User = Depends(get_current_user)):
    """Whether this account has two-factor enabled, and whether it must."""
    return {
        "mfa_enabled": bool(user.mfa_enabled),
        "required": user.role in STAFF_ROLES and settings.REQUIRE_MFA_FOR_STAFF,
    }


@router.post("/mfa/disable")
def mfa_disable(
    payload: MfaDisable,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Turns two-factor off. Requires the password AND a current code, so a
    hijacked session alone cannot weaken the account. Staff cannot disable it
    while it is mandatory.
    """
    if user.role in STAFF_ROLES and settings.REQUIRE_MFA_FOR_STAFF:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Two-factor authentication is mandatory for police and administrator accounts.",
        )
    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect password.")
    if not verify_totp(user.totp_secret, payload.code):
        raise HTTPException(status_code=400, detail="Invalid authenticator code.")

    user.mfa_enabled = False
    user.totp_secret = None
    db.add(user)
    db.commit()
    logger.info("mfa disabled for %s from %s", user.email, _client_ip(request))
    return {"mfa_enabled": False}
