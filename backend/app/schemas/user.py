"""
Pydantic schemas for the auth API.

Why separate from the SQLAlchemy model: the DB model (app/models/user.py)
defines storage. These schemas define the API's request/response shape —
e.g. we never want to return hashed_password in a response, so UserOut
simply omits it. Keeping these separate is standard FastAPI practice and
avoids ever accidentally leaking sensitive fields.
"""

import uuid
from pydantic import BaseModel, EmailStr

from app.models.user import UserRole


class UserCreate(BaseModel):
    """
    Public self-registration. Deliberately has NO `role` field: the endpoint
    always creates a citizen. Accepting a role here previously let anyone
    register themselves as police or admin.
    """

    email: EmailStr
    password: str
    full_name: str | None = None


class OfficerCreate(UserCreate):
    """Officer registration — requires the department's registration code."""

    access_code: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: uuid.UUID
    email: EmailStr
    full_name: str | None
    role: UserRole

    model_config = {"from_attributes": True}  # lets us do UserOut.model_validate(db_user)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginResponse(BaseModel):
    """
    Login result. A normal sign-in returns `access_token`. A staff account that
    has not enrolled in two-factor auth yet gets `mfa_enrollment_required` plus
    a short-lived `enrollment_token` instead — never a usable session.
    """

    access_token: str | None = None
    token_type: str = "bearer"
    mfa_enrollment_required: bool = False
    enrollment_token: str | None = None


class MfaSetupOut(BaseModel):
    """Enrollment payload: render `otpauth_uri` as a QR, show `secret` as fallback."""

    secret: str
    otpauth_uri: str


class MfaCode(BaseModel):
    code: str


class MfaDisable(BaseModel):
    password: str
    code: str
