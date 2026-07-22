"""
User model — backs JWT auth (citizens + police dashboard logins).

Design note: one table for both citizen and police users, distinguished by
`role`. Simpler than separate tables for a hackathon MVP, and role-based
access can be enforced in route dependencies later (e.g. dashboard routes
require role == "police").
"""

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, DateTime, Enum, Boolean
from sqlalchemy.dialects.postgresql import UUID

from app.db.session import Base


class UserRole(str, enum.Enum):
    citizen = "citizen"
    police = "police"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    role = Column(Enum(UserRole), default=UserRole.citizen, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)  # admins can disable accounts
    last_login = Column(DateTime, nullable=True)  # set on successful login
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
