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
    email: EmailStr
    password: str
    full_name: str | None = None
    role: UserRole = UserRole.citizen


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
