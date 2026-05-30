"""Write operations for chat threads, messages, and issue resolutions."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.models import ChatMessage, ChatThread, IssueResolution


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")


async def create_chat_thread(
    session: AsyncSession,
    *,
    thread_id: str,
    user_id: uuid.UUID,
    title: str | None = None,
    issue_id: int | None = None,
) -> ChatThread:
    now = _now()
    thread = ChatThread(
        id=thread_id,
        user_id=str(user_id),
        title=title,
        issue_id=issue_id,
        created_at=now,
        updated_at=now,
    )
    session.add(thread)
    await session.commit()
    await session.refresh(thread)
    return thread


async def touch_chat_thread(session: AsyncSession, thread_id: str) -> None:
    result = await session.get(ChatThread, thread_id)
    if result is not None:
        result.updated_at = _now()
        await session.commit()


async def add_chat_message(
    session: AsyncSession,
    *,
    thread_id: str,
    role: str,
    content: str,
) -> ChatMessage:
    message = ChatMessage(
        thread_id=thread_id,
        role=role,
        content=content,
        created_at=_now(),
    )
    session.add(message)
    await session.commit()
    await session.refresh(message)
    return message


async def create_issue_resolution(
    session: AsyncSession,
    *,
    issue_id: int,
    user_id: uuid.UUID,
    summary: str,
    proposed_fix: str,
    analysis: str | None = None,
    thread_id: str | None = None,
    status: str = "completed",
) -> IssueResolution:
    now = _now()
    resolution = IssueResolution(
        issue_id=issue_id,
        user_id=str(user_id),
        thread_id=thread_id,
        status=status,
        summary=summary,
        proposed_fix=proposed_fix,
        analysis=analysis,
        created_at=now,
        updated_at=now,
    )
    session.add(resolution)
    await session.commit()
    await session.refresh(resolution)
    return resolution
