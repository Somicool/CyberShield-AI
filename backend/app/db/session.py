"""
SQLAlchemy engine + session setup.

Why SQLAlchemy (vs raw psycopg2 or an ORM like Tortoise): it's the de facto
standard for FastAPI + Postgres, has mature docs, and using the ORM means we
don't hand-write SQL strings everywhere (safer against injection, easier to
read/modify under time pressure).
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# All models inherit from this Base
Base = declarative_base()


def get_db():
    """
    FastAPI dependency: yields a DB session per-request, closes it after.
    Use as: db: Session = Depends(get_db)
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
