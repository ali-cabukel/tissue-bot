"""Click + Rich CLI for GitHub data collection."""

from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
from pathlib import Path

import click

from backend.collectors import issues as issues_collector
from backend.collectors import repos as repos_collector
from backend.collectors.tracked import collect_tracked
from backend.console import console
from backend.db.store import Database
from backend.github.client import GitHubClient
from backend.settings import get_settings

ISSUE_STATES = click.Choice(["open", "closed", "all"], case_sensitive=False)


def _run(coro) -> None:
    asyncio.run(coro)


@asynccontextmanager
async def _github_client(db: Database):
    settings = get_settings()
    db.ensure_exists()
    token = settings.resolve_github_token()
    async with GitHubClient(token, base_url=settings.github_api_base_url) as client:
        yield client


@click.group()
@click.version_option(package_name="backend", prog_name="tissue")
def cli() -> None:
    """Collect GitHub repos and issues via REST API (httpx async)."""


@cli.command("init-db")
def init_db() -> None:
    """Create the SQLite database from schema."""

    async def _init() -> None:
        db = Database()
        try:
            await db.init()
        finally:
            await db.close()

    _run(_init())


@cli.group("collect-repos")
def collect_repos_group() -> None:
    """Collect repository metadata."""


@collect_repos_group.command("user")
@click.argument("owner", required=False, default=None)
@click.option("--limit", default=100, show_default=True, help="Maximum repos to fetch.")
def collect_repos_user(owner: str | None, limit: int) -> None:
    """List repos for a GitHub user."""

    async def _collect() -> None:
        db = Database()
        try:
            async with _github_client(db) as client:
                await repos_collector.collect_user_repos(client, db, owner, limit=limit)
        finally:
            await db.close()

    _run(_collect())


@collect_repos_group.command("org")
@click.argument("org")
@click.option("--limit", default=100, show_default=True)
def collect_repos_org(org: str, limit: int) -> None:
    """List repos for an organisation."""

    async def _collect() -> None:
        db = Database()
        try:
            async with _github_client(db) as client:
                await repos_collector.collect_org_repos(client, db, org, limit=limit)
        finally:
            await db.close()

    _run(_collect())


@collect_repos_group.command("search")
@click.argument("query")
@click.option("--limit", default=100, show_default=True)
def collect_repos_search(query: str, limit: int) -> None:
    """Search repositories on GitHub."""

    async def _collect() -> None:
        db = Database()
        try:
            async with _github_client(db) as client:
                await repos_collector.collect_search_repos(client, db, query, limit=limit)
        finally:
            await db.close()

    _run(_collect())


@collect_repos_group.command("repo")
@click.argument("full_name")
def collect_repos_repo(full_name: str) -> None:
    """Fetch a single repository."""

    async def _collect() -> None:
        db = Database()
        try:
            async with _github_client(db) as client:
                await repos_collector.collect_single_repo(client, db, full_name)
        finally:
            await db.close()

    _run(_collect())


@cli.command("collect-issues")
@click.argument("full_name")
@click.option("--state", type=ISSUE_STATES, default="open", show_default=True)
@click.option("--limit", default=100, show_default=True)
def collect_issues_cmd(full_name: str, state: str, limit: int) -> None:
    """Collect issues for a repository."""

    async def _collect() -> None:
        db = Database()
        try:
            async with _github_client(db) as client:
                await issues_collector.collect_issues(
                    client,
                    db,
                    full_name,
                    state=state,  # type: ignore[arg-type]
                    limit=limit,
                )
        finally:
            await db.close()

    _run(_collect())


@cli.command("collect-tracked")
@click.argument(
    "list_file",
    required=False,
    type=click.Path(path_type=Path),
    default=None,
)
@click.option("--issue-limit", default=100, show_default=True)
@click.option("--issue-state", type=ISSUE_STATES, default="open", show_default=True)
def collect_tracked_cmd(
    list_file: Path | None,
    issue_limit: int,
    issue_state: str,
) -> None:
    """Batch collect repos and issues from a tracked list file."""

    async def _collect() -> None:
        db = Database()
        try:
            path = list_file or get_settings().resolved_tracked_repos_file
            async with _github_client(db) as client:
                await collect_tracked(
                    client,
                    db,
                    path,
                    issue_limit=issue_limit,
                    issue_state=issue_state,  # type: ignore[arg-type]
                )
        finally:
            await db.close()

    _run(_collect())


def main() -> None:
    try:
        cli()
    except click.ClickException:
        raise
    except (FileNotFoundError, RuntimeError) as exc:
        console.print(f"[red]Error:[/red] {exc}")
        raise SystemExit(1) from exc
