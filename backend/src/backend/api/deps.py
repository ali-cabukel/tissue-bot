"""Shared API dependencies."""

from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from backend.github.client import GitHubClient
from backend.settings import get_settings


@asynccontextmanager
async def github_client() -> AsyncGenerator[GitHubClient]:
    settings = get_settings()
    token = settings.resolve_github_token()
    async with GitHubClient(token, base_url=settings.github_api_base_url) as client:
        yield client


def repo_full_name(owner: str, repo: str) -> str:
    return f"{owner}/{repo}"
