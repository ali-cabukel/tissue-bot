"""Async SQLite persistence via SQLAlchemy."""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import delete, select

from backend.console import info, warn
from backend.db.engine import get_engine, get_session_maker
from backend.db.init_db import init_schema
from backend.db.models import Issue, IssueLabel, Repo, SyncLog
from backend.db.upsert import dialect_insert
from backend.github.models import IssueRecord, RepoRecord
from backend.settings import Settings, get_settings


def _now() -> str:
    return datetime.now(UTC).strftime("%Y-%m-%d %H:%M:%S")


class Database:
    def __init__(self, path: Path | None = None) -> None:
        settings = get_settings()
        self.settings: Settings = settings
        self.path = path or settings.resolved_db_path
        self._engine = get_engine()
        self._sessions = get_session_maker()

    async def close(self) -> None:
        pass

    async def init(self) -> Path:
        if self.settings.is_sqlite:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            existed = self.path.exists()
        else:
            existed = False

        await init_schema(self._engine)

        if self.settings.is_sqlite:
            if existed:
                warn(f"Database already exists: {self.path}")
            else:
                info(f"Created database: [bold]{self.path}[/bold]")
        else:
            info("Postgres schema ready")
        return self.path

    def ensure_exists(self) -> None:
        if self.settings.is_sqlite and not self.path.exists():
            raise FileNotFoundError(f"Database not found at {self.path}. Run: tissue init-db")

    async def upsert_repo(self, repo: RepoRecord) -> None:
        now = _now()
        values = {
            "owner": repo.owner,
            "name": repo.name,
            "full_name": repo.full_name,
            "description": repo.description,
            "url": repo.url,
            "stars": repo.stars,
            "forks": repo.forks,
            "language": repo.language,
            "is_private": int(repo.is_private),
            "is_fork": int(repo.is_fork),
            "is_archived": int(repo.is_archived),
            "license_key": repo.license,
            "default_branch": repo.default_branch,
            "created_at": repo.created_at,
            "updated_at": repo.updated_at,
            "pushed_at": repo.pushed_at,
            "topics": repo.topics_json,
            "collected_at": now,
        }
        stmt = (
            dialect_insert(Repo)
            .values(**values)
            .on_conflict_do_update(
                index_elements=[Repo.full_name],
                set_={
                    Repo.description: values["description"],
                    Repo.url: values["url"],
                    Repo.stars: values["stars"],
                    Repo.forks: values["forks"],
                    Repo.language: values["language"],
                    Repo.is_private: values["is_private"],
                    Repo.is_fork: values["is_fork"],
                    Repo.is_archived: values["is_archived"],
                    Repo.license_key: values["license_key"],
                    Repo.default_branch: values["default_branch"],
                    Repo.updated_at: values["updated_at"],
                    Repo.pushed_at: values["pushed_at"],
                    Repo.topics: values["topics"],
                    Repo.collected_at: now,
                },
            )
        )
        async with self._sessions() as session:
            await session.execute(stmt)
            await session.commit()

    async def get_repo_id(self, full_name: str) -> int | None:
        async with self._sessions() as session:
            result = await session.execute(select(Repo.id).where(Repo.full_name == full_name))
            row = result.scalar_one_or_none()
        return row

    async def upsert_issue(self, repo_id: int, issue: IssueRecord) -> int:
        now = _now()
        values = {
            "repo_id": repo_id,
            "number": issue.number,
            "title": issue.title,
            "state": issue.state,
            "body": issue.body,
            "author": issue.author,
            "url": issue.url,
            "created_at": issue.created_at,
            "updated_at": issue.updated_at,
            "collected_at": now,
        }
        stmt = (
            dialect_insert(Issue)
            .values(**values)
            .on_conflict_do_update(
                index_elements=[Issue.repo_id, Issue.number],
                set_={
                    Issue.title: values["title"],
                    Issue.state: values["state"],
                    Issue.body: values["body"],
                    Issue.author: values["author"],
                    Issue.url: values["url"],
                    Issue.updated_at: values["updated_at"],
                    Issue.collected_at: now,
                },
            )
        )

        async with self._sessions() as session:
            await session.execute(stmt)
            await session.flush()

            result = await session.execute(
                select(Issue.id).where(
                    Issue.repo_id == repo_id,
                    Issue.number == issue.number,
                )
            )
            issue_id = result.scalar_one()

            await session.execute(delete(IssueLabel).where(IssueLabel.issue_id == issue_id))
            for label in issue.labels:
                session.add(IssueLabel(issue_id=issue_id, label_name=label))

            await session.commit()
        return issue_id

    async def log_sync(self, entity_type: str, entity_ref: str, status: str, message: str) -> None:
        async with self._sessions() as session:
            session.add(
                SyncLog(
                    entity_type=entity_type,
                    entity_ref=entity_ref,
                    status=status,
                    message=message,
                    synced_at=_now(),
                )
            )
            await session.commit()
