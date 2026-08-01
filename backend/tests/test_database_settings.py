"""Tests for database URL and schema settings."""

from backend.settings import Settings


def test_default_uses_sqlite():
    settings = Settings()
    assert settings.is_sqlite
    assert settings.resolved_database_url.startswith("sqlite+aiosqlite:///")


def test_postgresql_url_normalized_to_asyncpg():
    settings = Settings(
        DATABASE_URL="postgresql://user:pass@localhost:5432/postgres",
    )
    assert settings.resolved_database_url == (
        "postgresql+asyncpg://user:pass@localhost:5432/postgres"
    )
    assert not settings.is_sqlite


def test_sync_database_url_uses_psycopg_for_postgres():
    settings = Settings(
        DATABASE_URL="postgresql://user:pass@localhost:5432/postgres",
    )
    assert settings.sync_database_url == "postgresql+psycopg://user:pass@localhost:5432/postgres"


def test_database_schema_trimmed():
    settings = Settings(DATABASE_SCHEMA="  tissue-bot  ")
    assert settings.database_schema == "tissue-bot"
