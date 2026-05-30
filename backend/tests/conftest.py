"""Shared pytest fixtures."""

from __future__ import annotations

from collections.abc import AsyncIterator

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession

import backend.db.engine as engine_module
from backend.auth.models import User  # noqa: F401 — register user table
from backend.db.models import Base, Issue, IssueLabel, Repo
from backend.db.session import create_engine, create_session_factory
from backend.settings import get_settings


@pytest.fixture(autouse=True)
def _reset_engine_and_settings(monkeypatch: pytest.MonkeyPatch, tmp_path):
    """Use an isolated SQLite file and fresh engine for each test."""
    db_path = tmp_path / "test.db"
    monkeypatch.setenv("DB_PATH", str(db_path))
    get_settings.cache_clear()
    engine_module._engine = None
    engine_module._session_maker = None
    yield
    get_settings.cache_clear()
    engine_module._engine = None
    engine_module._session_maker = None


@pytest_asyncio.fixture
async def db_session() -> AsyncIterator[AsyncSession]:
    engine = create_engine(get_settings().resolved_db_path)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = create_session_factory(engine)
    async with session_factory() as session:
        yield session

    await engine.dispose()


@pytest_asyncio.fixture
async def seeded_data(db_session: AsyncSession):
    repo = Repo(
        owner="numpy",
        name="numpy",
        full_name="numpy/numpy",
        description="Array computing library",
        url="https://github.com/numpy/numpy",
        stars=5000,
        forks=900,
        language="Python",
        is_private=0,
        is_fork=0,
        is_archived=0,
        topics='["python", "science"]',
        collected_at="2024-01-01 00:00:00",
    )
    db_session.add(repo)
    await db_session.flush()

    issue = Issue(
        repo_id=repo.id,
        number=42,
        title="dtype conversion bug",
        state="OPEN",
        body="Arrays fail when casting float64",
        author="alice",
        url="https://github.com/numpy/numpy/issues/42",
        collected_at="2024-01-01 00:00:00",
    )
    db_session.add(issue)
    await db_session.flush()
    db_session.add(IssueLabel(issue_id=issue.id, label_name="bug"))
    await db_session.commit()

    return {"repo": repo, "issue": issue}
