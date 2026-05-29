"""Collect repository metadata from GitHub into SQLite."""

from __future__ import annotations

from backend.console import done, info, success
from backend.db.store import Database
from backend.github.client import GitHubClient
from backend.github.models import RepoRecord


async def collect_user_repos(
    client: GitHubClient,
    db: Database,
    username: str | None = None,
    *,
    limit: int = 100,
) -> int:
    target = username or await client.get_authenticated_user()
    info(f"Collecting repos for user: [bold]{target}[/bold] (limit {limit})")
    raw_repos = await client.list_user_repos(target, limit=limit)
    return await _store_repos(db, raw_repos, entity_ref=f"user:{target}")


async def collect_org_repos(
    client: GitHubClient,
    db: Database,
    org: str,
    *,
    limit: int = 100,
) -> int:
    info(f"Collecting repos for org: [bold]{org}[/bold] (limit {limit})")
    raw_repos = await client.list_org_repos(org, limit=limit)
    return await _store_repos(db, raw_repos, entity_ref=f"org:{org}")


async def collect_search_repos(
    client: GitHubClient,
    db: Database,
    query: str,
    *,
    limit: int = 100,
) -> int:
    info(f"Searching repos: [bold]{query}[/bold] (limit {limit})")
    raw_repos = await client.search_repos(query, limit=limit)
    return await _store_repos(db, raw_repos, entity_ref=f"search:{query}")


async def collect_single_repo(
    client: GitHubClient,
    db: Database,
    full_name: str,
) -> int:
    info(f"Collecting repo: [bold]{full_name}[/bold]")
    raw = await client.get_repo(full_name)
    return await _store_repos(db, [raw], entity_ref=f"repo:{full_name}")


async def _store_repos(db: Database, raw_repos: list[dict], *, entity_ref: str) -> int:
    for raw in raw_repos:
        repo = RepoRecord.from_api(raw, topics=raw.get("topics"))
        await db.upsert_repo(repo)
        success(repo.full_name)
    await db.log_sync("repo", entity_ref, "ok", f"Collected {len(raw_repos)} repos")
    done(f"Stored {len(raw_repos)} repos in {db.path}")
    return len(raw_repos)
