"""Collect issues from GitHub into SQLite."""

from __future__ import annotations

from backend.collectors.repos import collect_single_repo
from backend.console import done, info, success, warn
from backend.db.store import Database
from backend.github.client import GitHubClient, IssueState
from backend.github.models import IssueRecord


async def collect_issues(
    client: GitHubClient,
    db: Database,
    full_name: str,
    *,
    state: IssueState = "open",
    limit: int = 100,
) -> int:
    repo_id = await db.get_repo_id(full_name)
    if repo_id is None:
        warn("Repo not in database, fetching metadata first...")
        await collect_single_repo(client, db, full_name)
        repo_id = await db.get_repo_id(full_name)
        if repo_id is None:
            raise RuntimeError(f"Failed to store repo: {full_name}")

    info(f"Collecting issues for [bold]{full_name}[/bold] (state={state}, limit={limit})")
    raw_issues = await client.list_issues(full_name, state=state, limit=limit)

    for raw in raw_issues:
        issue = IssueRecord.from_api(raw)
        await db.upsert_issue(repo_id, issue)
        success(f"#{issue.number} {issue.title}")

    await db.log_sync("issue", full_name, "ok", f"Collected {len(raw_issues)} issues")
    done(f"Stored {len(raw_issues)} issues in {db.path}")
    return len(raw_issues)
