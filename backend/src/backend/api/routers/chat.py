"""Chat endpoints for the LangGraph agent."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.agents.service import get_agent_service
from backend.api.schemas import (
    ChatMessageCreate,
    ChatMessageOut,
    ChatReplyOut,
    ChatThreadCreate,
    ChatThreadOut,
)
from backend.auth.deps import current_active_user
from backend.auth.models import User
from backend.db.chat_repository import (
    fetch_chat_messages,
    fetch_chat_thread,
    fetch_chat_threads,
)
from backend.db.engine import get_async_session

router = APIRouter(prefix="/chat", tags=["chat"])


def _thread_out(thread) -> ChatThreadOut:
    issue = thread.issue
    return ChatThreadOut(
        id=thread.id,
        title=thread.title,
        issue_full_name=issue.repo.full_name if issue and issue.repo else None,
        issue_number=issue.number if issue else None,
        created_at=thread.created_at,
        updated_at=thread.updated_at,
    )


@router.post("/threads", response_model=ChatThreadOut, status_code=status.HTTP_201_CREATED)
async def create_thread(
    payload: ChatThreadCreate,
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
) -> ChatThreadOut:
    agent = get_agent_service()
    thread_id, _ = await agent.create_thread(
        user.id,
        title=payload.title,
        owner=payload.owner,
        repo=payload.repo,
        number=payload.number,
    )
    thread = await fetch_chat_thread(session, thread_id, user.id)
    if thread is None:
        raise HTTPException(status_code=500, detail="Failed to create chat thread")
    return _thread_out(thread)


@router.get("/threads", response_model=list[ChatThreadOut])
async def list_threads(
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
) -> list[ChatThreadOut]:
    threads = await fetch_chat_threads(session, user.id)
    return [_thread_out(thread) for thread in threads]


@router.get("/threads/{thread_id}/messages", response_model=list[ChatMessageOut])
async def list_messages(
    thread_id: str,
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
) -> list[ChatMessageOut]:
    thread = await fetch_chat_thread(session, thread_id, user.id)
    if thread is None:
        raise HTTPException(status_code=404, detail="Chat thread not found")
    messages = await fetch_chat_messages(session, thread_id)
    return [ChatMessageOut.model_validate(message) for message in messages]


@router.post("/threads/{thread_id}/messages", response_model=ChatReplyOut)
async def send_message(
    thread_id: str,
    payload: ChatMessageCreate,
    user: User = Depends(current_active_user),
) -> ChatReplyOut:
    agent = get_agent_service()
    try:
        user_message, assistant_message = await agent.send_message(
            user.id, thread_id, payload.content
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Agent failed: {exc}",
        ) from exc

    return ChatReplyOut(
        thread_id=thread_id,
        message=ChatMessageOut.model_validate(user_message),
        reply=ChatMessageOut.model_validate(assistant_message),
    )
