"""
Offline staff-account management — the break-glass path.

Two-factor is mandatory for police and administrator accounts, which raises an
obvious question: what happens if the only administrator loses their phone?
There is no email delivery in this system, so the answer has to be a command
run on the server by whoever controls it.

Usage (from the backend directory, with the venv active):

    # create the first administrator
    python -m app.scripts.manage_staff create-admin officer@dept.gov.in

    # promote / create a police account
    python -m app.scripts.manage_staff create-officer officer@dept.gov.in

    # clear a lost authenticator so the officer can enrol a new one
    python -m app.scripts.manage_staff reset-mfa officer@dept.gov.in

    # clear a failed-attempt lockout
    python -m app.scripts.manage_staff unlock officer@dept.gov.in

    # list staff accounts and their 2FA state
    python -m app.scripts.manage_staff list-staff

Passwords are prompted for, never passed as arguments, so they don't end up in
the shell history.
"""

import getpass
import sys

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.user import User, UserRole


def _get(db, email: str) -> User:
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        sys.exit(f"No account found for {email}")
    return user


def _prompt_password() -> str:
    minimum = settings.MIN_STAFF_PASSWORD_LENGTH
    while True:
        pw = getpass.getpass(f"New password (min {minimum} chars): ")
        if len(pw) < minimum:
            print(f"Too short — needs at least {minimum} characters.")
            continue
        if pw != getpass.getpass("Confirm password: "):
            print("Passwords did not match.")
            continue
        return pw


def create_staff(email: str, role: UserRole) -> None:
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email).first()
        password = _prompt_password()
        if existing:
            existing.role = role
            existing.hashed_password = hash_password(password)
            existing.is_active = True
            existing.mfa_enabled = False
            existing.totp_secret = None
            existing.failed_login_attempts = 0
            existing.locked_until = None
            db.add(existing)
            db.commit()
            print(f"Updated {email} -> {role.value}. Two-factor enrollment required at next sign-in.")
        else:
            db.add(
                User(
                    email=email,
                    hashed_password=hash_password(password),
                    role=role,
                    is_active=True,
                )
            )
            db.commit()
            print(f"Created {email} as {role.value}. Two-factor enrollment required at first sign-in.")
    finally:
        db.close()


def reset_mfa(email: str) -> None:
    db = SessionLocal()
    try:
        user = _get(db, email)
        user.mfa_enabled = False
        user.totp_secret = None
        user.failed_login_attempts = 0
        user.locked_until = None
        db.add(user)
        db.commit()
        print(f"Cleared two-factor enrollment for {email}. They must enrol again at next sign-in.")
    finally:
        db.close()


def unlock(email: str) -> None:
    db = SessionLocal()
    try:
        user = _get(db, email)
        user.failed_login_attempts = 0
        user.locked_until = None
        db.add(user)
        db.commit()
        print(f"Unlocked {email}.")
    finally:
        db.close()


def list_staff() -> None:
    db = SessionLocal()
    try:
        rows = db.query(User).filter(User.role.in_([UserRole.police, UserRole.admin])).all()
        if not rows:
            print("No staff accounts.")
            return
        print(f"{'email':<38} {'role':<8} {'active':<7} {'2fa':<5} locked_until")
        for u in rows:
            print(
                f"{u.email:<38} {u.role.value:<8} {str(bool(u.is_active)):<7} "
                f"{str(bool(u.mfa_enabled)):<5} {u.locked_until or '-'}"
            )
    finally:
        db.close()


COMMANDS = {
    "create-admin": lambda a: create_staff(a, UserRole.admin),
    "create-officer": lambda a: create_staff(a, UserRole.police),
    "reset-mfa": reset_mfa,
    "unlock": unlock,
}


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit(__doc__)

    command = sys.argv[1]
    if command == "list-staff":
        list_staff()
        return

    handler = COMMANDS.get(command)
    if handler is None or len(sys.argv) < 3:
        sys.exit(__doc__)
    handler(sys.argv[2].strip().lower())


if __name__ == "__main__":
    main()
