"""Read-only queries for stored GitHub data."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.db.models import Issue, Repo


async def fetch_repos(
    session: AsyncSession,
    *,
    limit: int = 50,
    offset: int = 0,
) -> list[Repo]:
    result = await session.execute(
        select(Repo).order_by(Repo.stars.desc()).limit(limit).offset(offset)
    )
    return list(result.scalars().all())


async def fetch_repo(session: AsyncSession, full_name: str) -> Repo | None:
    result = await session.execute(select(Repo).where(Repo.full_name == full_name))
    return result.scalar_one_or_none()


async def fetch_issues(
    session: AsyncSession,
    full_name: str,
    *,
    state: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[Issue]:
    query = (
        select(Issue)
        .join(Repo)
        .where(Repo.full_name == full_name)
        .options(selectinload(Issue.labels))
        .order_by(Issue.updated_at.desc())
        .limit(limit)
        .offset(offset)
    )
    if state is not None:
        query = query.where(Issue.state == state.upper())
    result = await session.execute(query)
    return list(result.scalars().unique().all())


async def fetch_issue(
    session: AsyncSession,
    full_name: str,
    number: int,
) -> Issue | None:
    result = await session.execute(
        select(Issue)
        .join(Repo)
        .where(Repo.full_name == full_name, Issue.number == number)
        .options(selectinload(Issue.labels))
    )
    return result.scalar_one_or_none()
