"""Issue resolution endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.deps import repo_full_name
from backend.api.schemas import PaginatedResolutions, ResolutionOut
from backend.auth.deps import current_active_user
from backend.auth.models import User
from backend.db.chat_repository import fetch_resolution, fetch_resolutions
from backend.db.engine import get_async_session

router = APIRouter(tags=["resolutions"])


def _resolution_out(row) -> ResolutionOut:
    issue = row.issue
    return ResolutionOut(
        id=row.id,
        issue_id=row.issue_id,
        full_name=issue.repo.full_name,
        issue_number=issue.number,
        issue_title=issue.title,
        status=row.status,
        summary=row.summary,
        proposed_fix=row.proposed_fix,
        analysis=row.analysis,
        thread_id=row.thread_id,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.get("/resolutions", response_model=PaginatedResolutions)
async def list_resolutions(
    q: str | None = Query(None, description="Search summary, fix, or issue title"),
    owner: str | None = None,
    repo: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
) -> PaginatedResolutions:
    full_name = repo_full_name(owner, repo) if owner and repo else None
    rows = await fetch_resolutions(
        session,
        user.id,
        query=q,
        full_name=full_name,
        limit=limit,
    )
    return PaginatedResolutions(
        items=[_resolution_out(row) for row in rows],
        count=len(rows),
    )


@router.get("/resolutions/{resolution_id}", response_model=ResolutionOut)
async def get_resolution(
    resolution_id: int,
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
) -> ResolutionOut:
    row = await fetch_resolution(session, resolution_id, user.id)
    if row is None:
        raise HTTPException(status_code=404, detail="Resolution not found")
    return _resolution_out(row)
