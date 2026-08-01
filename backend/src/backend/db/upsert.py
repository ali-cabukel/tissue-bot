"""Dialect-specific INSERT … ON CONFLICT helpers."""

from __future__ import annotations

from sqlalchemy.sql.dml import Insert

from backend.settings import get_settings


def dialect_insert(table) -> Insert:
    settings = get_settings()
    if settings.is_sqlite:
        from sqlalchemy.dialects.sqlite import insert

        return insert(table)
    from sqlalchemy.dialects.postgresql import insert

    return insert(table)
