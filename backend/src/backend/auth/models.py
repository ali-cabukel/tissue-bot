"""FastAPI Users SQLAlchemy model."""

from __future__ import annotations

from fastapi_users_db_sqlalchemy import SQLAlchemyBaseUserTableUUID

from backend.db.models import Base


class User(SQLAlchemyBaseUserTableUUID, Base):
    pass
