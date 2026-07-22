"""
Auth routes: signup + login.

Login uses OAuth2PasswordRequestForm (form fields: username, password) because
that's what FastAPI's OAuth2PasswordBearer/Swagger UI expects by default —
we map the "username" field to email. This keeps the interactive /docs page
usable for testing without extra config.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.security import hash_password, verify_password, create_access_token
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserOut, Token

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/me", response_model=UserOut)
def read_me(current_user: User = Depends(get_current_user)):
    """Returns the authenticated user's profile (used by the Citizen Portal)."""
    return current_user


@router.post("/signup", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def signup(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    # Disabled accounts (set by an administrator) cannot authenticate.
    if getattr(user, "is_active", True) is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been disabled. Contact an administrator.",
        )

    from datetime import datetime, timezone
    user.last_login = datetime.now(timezone.utc)
    db.add(user)
    db.commit()

    token = create_access_token(data={"sub": str(user.id), "role": user.role.value})
    return Token(access_token=token)
