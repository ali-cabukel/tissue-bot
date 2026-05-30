"""Issue collection and fetch routes."""

from __future__ import annotations

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.deps import github_client, repo_full_name
from backend.api.errors import raise_github_http_error
from backend.api.schemas import (
    ChatMessageOut,
    ChatReplyOut,
    CollectResult,
    IssueOut,
    PaginatedIssues,
)
from backend.auth.deps import current_active_user
from backend.auth.models import User
from backend.collectors.issues import collect_issues
from backend.db.engine import get_async_session, get_session_maker
from backend.db.repository import fetch_issue, fetch_issues
from backend.db.store import Database
from backend.github.client import IssueState

router = APIRouter(prefix="/repos/{owner}/{repo}/issues", tags=["issues"])


@router.post("/collect", response_model=CollectResult)
async def collect_repo_issues(
    owner: str,
    repo: str,
    state: IssueState = Query("open"),
    limit: int = Query(100, ge=1, le=500),
    user: User = Depends(current_active_user),
) -> CollectResult:
    full_name = repo_full_name(owner, repo)
    db = Database()
    try:
        async with github_client() as client:
            count = await collect_issues(client, db, full_name, state=state, limit=limit)
    except httpx.HTTPStatusError as exc:
        raise_github_http_error(exc)
    finally:
        await db.close()
    return CollectResult(
        full_name=full_name,
        collected=count,
        message=f"Collected {count} issues for {full_name}",
    )


@router.get("", response_model=PaginatedIssues)
async def list_issues(
    owner: str,
    repo: str,
    state: str | None = Query(None, pattern="^(?i)(open|closed)$"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
) -> PaginatedIssues:
    full_name = repo_full_name(owner, repo)
    normalized_state = state.upper() if state else None
    issues = await fetch_issues(
        session,
        full_name,
        state=normalized_state,
        limit=limit,
        offset=offset,
    )
    return PaginatedIssues(
        items=[IssueOut.model_validate(i) for i in issues],
        full_name=full_name,
        limit=limit,
        offset=offset,
        count=len(issues),
    )


@router.get("/{number}", response_model=IssueOut)
async def get_issue(
    owner: str,
    repo: str,
    number: int,
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
) -> IssueOut:
    full_name = repo_full_name(owner, repo)
    row = await fetch_issue(session, full_name, number)
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Issue #{number} not found for {full_name}",
        )
    return IssueOut.model_validate(row)


@router.post("/{number}/resolve", response_model=ChatReplyOut, status_code=status.HTTP_201_CREATED)
async def resolve_issue(
    owner: str,
    repo: str,
    number: int,
    user: User = Depends(current_active_user),
) -> ChatReplyOut:
    from backend.agents.service import get_agent_service

    full_name = repo_full_name(owner, repo)
    async with get_session_maker()() as session:
        issue = await fetch_issue(session, full_name, number)
        if issue is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Issue not found locally: {full_name}#{number}. Collect it first.",
            )
        issue_title = issue.title

    agent = get_agent_service()
    thread_id, _ = await agent.create_thread(
        user.id,
        title=f"Resolve {full_name}#{number}",
        owner=owner,
        repo=repo,
        number=number,
    )
    prompt = (
        f"Analyze and propose a local resolution for {full_name}#{number}: {issue_title}. "
        "Read the issue details, explain your analysis, and save the resolution locally."
    )
    try:
        user_message, assistant_message = await agent.send_message(user.id, thread_id, prompt)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Agent failed: {exc}") from exc

    return ChatReplyOut(
        thread_id=thread_id,
        message=ChatMessageOut.model_validate(user_message),
        reply=ChatMessageOut.model_validate(assistant_message),
    )
