"""Batch-collect repos and issues from a tracked list file."""

from __future__ import annotations

from pathlib import Path

from backend.collectors.issues import collect_issues
from backend.collectors.repos import collect_single_repo
from backend.console import done, heading, info
from backend.db.store import Database
from backend.github.client import GitHubClient, IssueState
from backend.settings import get_settings


def load_tracked_repos(path: Path) -> list[str]:
    repos: list[str] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.split("#", 1)[0].strip()
        if line:
            repos.append(line)
    return repos


async def collect_tracked(
    client: GitHubClient,
    db: Database,
    list_file: Path | None = None,
    *,
    issue_limit: int = 100,
    issue_state: IssueState = "open",
) -> int:
    path = list_file or get_settings().resolved_tracked_repos_file
    if not path.exists():
        raise FileNotFoundError(f"Repo list not found: {path}")

    repos = load_tracked_repos(path)
    if not repos:
        raise ValueError(f"No repos found in {path}")

    info(f"Tracking [bold]{len(repos)}[/bold] repos from {path}")
    for full_name in repos:
        heading(full_name)
        await collect_single_repo(client, db, full_name)
        await collect_issues(client, db, full_name, state=issue_state, limit=issue_limit)

    done(f"Processed {len(repos)} repos")
    return len(repos)
