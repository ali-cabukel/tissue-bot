"""Read queries for chat, resolutions, and agent search tools."""

from __future__ import annotations

import uuid

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.db.models import ChatMessage, ChatThread, Issue, IssueResolution, Repo


async def search_repos(
    session: AsyncSession,
    query: str,
    *,
    limit: int = 20,
) -> list[Repo]:
    pattern = f"%{query.strip()}%"
    result = await session.execute(
        select(Repo)
        .where(
            or_(
                Repo.full_name.ilike(pattern),
                Repo.owner.ilike(pattern),
                Repo.name.ilike(pattern),
                Repo.description.ilike(pattern),
                Repo.language.ilike(pattern),
                Repo.topics.ilike(pattern),
            )
        )
        .order_by(Repo.stars.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def search_issues(
    session: AsyncSession,
    query: str,
    *,
    full_name: str | None = None,
    state: str | None = None,
    limit: int = 20,
) -> list[Issue]:
    pattern = f"%{query.strip()}%"
    stmt = (
        select(Issue)
        .join(Repo)
        .options(selectinload(Issue.labels), selectinload(Issue.repo))
        .where(
            or_(
                Issue.title.ilike(pattern),
                Issue.body.ilike(pattern),
                Issue.author.ilike(pattern),
                Issue.state.ilike(pattern),
            )
        )
        .order_by(Issue.updated_at.desc())
        .limit(limit)
    )
    if full_name:
        stmt = stmt.where(Repo.full_name == full_name)
    if state:
        stmt = stmt.where(Issue.state == state.upper())
    result = await session.execute(stmt)
    return list(result.scalars().unique().all())


async def fetch_chat_threads(
    session: AsyncSession,
    user_id: uuid.UUID,
    *,
    limit: int = 50,
) -> list[ChatThread]:
    result = await session.execute(
        select(ChatThread)
        .where(ChatThread.user_id == str(user_id))
        .options(selectinload(ChatThread.issue).selectinload(Issue.repo))
        .order_by(ChatThread.updated_at.desc())
        .limit(limit)
    )
    return list(result.scalars().unique().all())


async def fetch_chat_thread(
    session: AsyncSession,
    thread_id: str,
    user_id: uuid.UUID,
) -> ChatThread | None:
    result = await session.execute(
        select(ChatThread)
        .where(ChatThread.id == thread_id, ChatThread.user_id == str(user_id))
        .options(selectinload(ChatThread.issue).selectinload(Issue.repo))
    )
    return result.scalar_one_or_none()


async def fetch_chat_messages(
    session: AsyncSession,
    thread_id: str,
) -> list[ChatMessage]:
    result = await session.execute(
        select(ChatMessage)
        .where(ChatMessage.thread_id == thread_id)
        .order_by(ChatMessage.created_at.asc(), ChatMessage.id.asc())
    )
    return list(result.scalars().all())


async def fetch_resolutions(
    session: AsyncSession,
    user_id: uuid.UUID,
    *,
    query: str | None = None,
    full_name: str | None = None,
    limit: int = 50,
) -> list[IssueResolution]:
    stmt = (
        select(IssueResolution)
        .join(Issue)
        .join(Repo)
        .where(IssueResolution.user_id == str(user_id))
        .options(
            selectinload(IssueResolution.issue).selectinload(Issue.repo),
            selectinload(IssueResolution.issue).selectinload(Issue.labels),
        )
        .order_by(IssueResolution.updated_at.desc())
        .limit(limit)
    )
    if full_name:
        stmt = stmt.where(Repo.full_name == full_name)
    if query:
        pattern = f"%{query.strip()}%"
        stmt = stmt.where(
            or_(
                IssueResolution.summary.ilike(pattern),
                IssueResolution.proposed_fix.ilike(pattern),
                IssueResolution.analysis.ilike(pattern),
                Issue.title.ilike(pattern),
            )
        )

    result = await session.execute(stmt)
    return list(result.scalars().unique().all())


async def fetch_resolution(
    session: AsyncSession,
    resolution_id: int,
    user_id: uuid.UUID,
) -> IssueResolution | None:
    result = await session.execute(
        select(IssueResolution)
        .where(
            IssueResolution.id == resolution_id,
            IssueResolution.user_id == str(user_id),
        )
        .options(
            selectinload(IssueResolution.issue).selectinload(Issue.repo),
            selectinload(IssueResolution.issue).selectinload(Issue.labels),
        )
    )
    return result.scalar_one_or_none()
