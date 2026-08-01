"""Repository collection and fetch routes."""

from __future__ import annotations

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.deps import github_client, repo_full_name
from backend.api.errors import raise_github_http_error
from backend.api.schemas import (
    CollectResult,
    CollectTrackedResult,
    PaginatedRepos,
    RepoOut,
    TrackedRepoOut,
    TrackedReposOut,
)
from backend.auth.deps import current_active_user
from backend.auth.models import User
from backend.collectors.repos import collect_single_repo
from backend.collectors.tracked import collect_tracked, load_tracked_repos
from backend.db.engine import get_async_session
from backend.db.repository import fetch_collected_full_names, fetch_repo, fetch_repos
from backend.db.store import Database
from backend.github.client import IssueState
from backend.settings import get_settings

router = APIRouter(prefix="/repos", tags=["repos"])


@router.get("/tracked", response_model=TrackedReposOut)
async def list_tracked_repos(
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
) -> TrackedReposOut:
    settings = get_settings()
    path = settings.resolved_tracked_repos_file
    if not path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tracked repos file not found: {path}",
        )

    full_names = load_tracked_repos(path)
    collected = await fetch_collected_full_names(session, full_names)
    return TrackedReposOut(
        source_file=str(path),
        items=[
            TrackedRepoOut(full_name=full_name, collected=full_name in collected)
            for full_name in full_names
        ],
        count=len(full_names),
    )


@router.post("/collect-tracked", response_model=CollectTrackedResult)
async def collect_tracked_repos(
    issue_limit: int = Query(50, ge=1, le=200),
    issue_state: IssueState = Query("open"),
    user: User = Depends(current_active_user),
) -> CollectTrackedResult:
    db = Database()
    try:
        async with github_client() as client:
            count = await collect_tracked(
                client,
                db,
                issue_limit=issue_limit,
                issue_state=issue_state,
            )
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except httpx.HTTPStatusError as exc:
        raise_github_http_error(exc)
    finally:
        await db.close()

    return CollectTrackedResult(
        collected=count,
        message=f"Collected {count} tracked scientific libraries",
    )


@router.post("/{owner}/{repo}/collect", response_model=CollectResult)
async def collect_repo(
    owner: str,
    repo: str,
    user: User = Depends(current_active_user),
) -> CollectResult:
    full_name = repo_full_name(owner, repo)
    db = Database()
    try:
        async with github_client() as client:
            count = await collect_single_repo(client, db, full_name)
    except httpx.HTTPStatusError as exc:
        raise_github_http_error(exc)
    finally:
        await db.close()
    return CollectResult(
        full_name=full_name,
        collected=count,
        message=f"Collected repository {full_name}",
    )


@router.get("", response_model=PaginatedRepos)
async def list_repos(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
) -> PaginatedRepos:
    repos = await fetch_repos(session, limit=limit, offset=offset)
    return PaginatedRepos(
        items=[RepoOut.model_validate(r) for r in repos],
        limit=limit,
        offset=offset,
        count=len(repos),
    )


@router.get("/{owner}/{repo}", response_model=RepoOut)
async def get_repo(
    owner: str,
    repo: str,
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
) -> RepoOut:
    full_name = repo_full_name(owner, repo)
    row = await fetch_repo(session, full_name)
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Repository not found: {full_name}",
        )
    return RepoOut.model_validate(row)
