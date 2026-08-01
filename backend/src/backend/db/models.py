"""SQLAlchemy ORM models matching db/schema.sql."""

from __future__ import annotations

from sqlalchemy import ForeignKey, Index, Integer, String, Text, UniqueConstraint, text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

from backend.db.schema import metadata


class Base(DeclarativeBase):
    metadata = metadata


_TIMESTAMP_DEFAULT = text("CURRENT_TIMESTAMP")


class Repo(Base):
    __tablename__ = "repos"
    __table_args__ = (
        Index("idx_repos_owner", "owner"),
        Index("idx_repos_language", "language"),
        Index("idx_repos_stars", "stars"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    owner: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    full_name: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text)
    url: Mapped[str] = mapped_column(String, nullable=False)
    stars: Mapped[int] = mapped_column(Integer, default=0)
    forks: Mapped[int] = mapped_column(Integer, default=0)
    language: Mapped[str | None] = mapped_column(String)
    is_private: Mapped[int] = mapped_column(Integer, default=0)
    is_fork: Mapped[int] = mapped_column(Integer, default=0)
    is_archived: Mapped[int] = mapped_column(Integer, default=0)
    license_key: Mapped[str | None] = mapped_column("license", String)
    default_branch: Mapped[str | None] = mapped_column(String)
    created_at: Mapped[str | None] = mapped_column(String)
    updated_at: Mapped[str | None] = mapped_column(String)
    pushed_at: Mapped[str | None] = mapped_column(String)
    topics: Mapped[str | None] = mapped_column(Text)
    collected_at: Mapped[str] = mapped_column(
        String, nullable=False, server_default=_TIMESTAMP_DEFAULT
    )

    issues: Mapped[list[Issue]] = relationship(back_populates="repo", cascade="all, delete-orphan")


class Issue(Base):
    __tablename__ = "issues"
    __table_args__ = (
        UniqueConstraint("repo_id", "number"),
        Index("idx_issues_repo_id", "repo_id"),
        Index("idx_issues_state", "state"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    repo_id: Mapped[int] = mapped_column(ForeignKey("repos.id", ondelete="CASCADE"), nullable=False)
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    state: Mapped[str] = mapped_column(String, nullable=False)
    body: Mapped[str | None] = mapped_column(Text)
    author: Mapped[str | None] = mapped_column(String)
    url: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[str | None] = mapped_column(String)
    updated_at: Mapped[str | None] = mapped_column(String)
    collected_at: Mapped[str] = mapped_column(
        String, nullable=False, server_default=_TIMESTAMP_DEFAULT
    )

    repo: Mapped[Repo] = relationship(back_populates="issues")
    labels: Mapped[list[IssueLabel]] = relationship(
        back_populates="issue", cascade="all, delete-orphan"
    )


class IssueLabel(Base):
    __tablename__ = "issue_labels"

    issue_id: Mapped[int] = mapped_column(
        ForeignKey("issues.id", ondelete="CASCADE"), primary_key=True
    )
    label_name: Mapped[str] = mapped_column(String, primary_key=True)

    issue: Mapped[Issue] = relationship(back_populates="labels")


class SyncLog(Base):
    __tablename__ = "sync_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    entity_type: Mapped[str] = mapped_column(String, nullable=False)
    entity_ref: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False)
    message: Mapped[str | None] = mapped_column(Text)
    synced_at: Mapped[str] = mapped_column(
        String, nullable=False, server_default=_TIMESTAMP_DEFAULT
    )


class ChatThread(Base):
    __tablename__ = "chat_threads"
    __table_args__ = (Index("idx_chat_threads_user_id", "user_id"),)

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str | None] = mapped_column(String)
    issue_id: Mapped[int | None] = mapped_column(ForeignKey("issues.id", ondelete="SET NULL"))
    created_at: Mapped[str] = mapped_column(
        String, nullable=False, server_default=_TIMESTAMP_DEFAULT
    )
    updated_at: Mapped[str] = mapped_column(
        String, nullable=False, server_default=_TIMESTAMP_DEFAULT
    )

    issue: Mapped[Issue | None] = relationship()
    messages: Mapped[list[ChatMessage]] = relationship(
        back_populates="thread", cascade="all, delete-orphan"
    )


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    __table_args__ = (Index("idx_chat_messages_thread_id", "thread_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    thread_id: Mapped[str] = mapped_column(
        ForeignKey("chat_threads.id", ondelete="CASCADE"), nullable=False
    )
    role: Mapped[str] = mapped_column(String, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[str] = mapped_column(
        String, nullable=False, server_default=_TIMESTAMP_DEFAULT
    )

    thread: Mapped[ChatThread] = relationship(back_populates="messages")


class IssueResolution(Base):
    __tablename__ = "issue_resolutions"
    __table_args__ = (
        Index("idx_issue_resolutions_issue_id", "issue_id"),
        Index("idx_issue_resolutions_user_id", "user_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    issue_id: Mapped[int] = mapped_column(
        ForeignKey("issues.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[str] = mapped_column(String, nullable=False)
    thread_id: Mapped[str | None] = mapped_column(
        ForeignKey("chat_threads.id", ondelete="SET NULL")
    )
    status: Mapped[str] = mapped_column(String, nullable=False, default="completed")
    summary: Mapped[str | None] = mapped_column(Text)
    proposed_fix: Mapped[str | None] = mapped_column(Text)
    analysis: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[str] = mapped_column(
        String, nullable=False, server_default=_TIMESTAMP_DEFAULT
    )
    updated_at: Mapped[str] = mapped_column(
        String, nullable=False, server_default=_TIMESTAMP_DEFAULT
    )

    issue: Mapped[Issue] = relationship()
