"""LangGraph checkpointer lifecycle (Postgres or SQLite)."""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from urllib.parse import parse_qsl, quote, urlencode, urlparse, urlunparse

from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver

from backend.db.schema import qualified_schema
from backend.settings import Settings, get_settings


def _postgres_conn_string(settings: Settings) -> str:
    """Sync psycopg URL for LangGraph, with optional search_path for schema isolation."""
    url = settings.sync_database_url
    schema = qualified_schema()
    if not schema:
        return url

    parsed = urlparse(url)
    query = dict(parse_qsl(parsed.query, keep_blank_values=True))
    existing = query.get("options", "")
    search_opt = f"-csearch_path={schema}"
    query["options"] = f"{existing} {search_opt}".strip() if existing else search_opt
    return urlunparse(parsed._replace(query=urlencode(query, quote_via=quote)))


@asynccontextmanager
async def checkpointer_lifespan() -> AsyncIterator[BaseCheckpointSaver]:
    settings = get_settings()
    if settings.is_sqlite:
        path = settings.resolved_checkpoint_db_path
        path.parent.mkdir(parents=True, exist_ok=True)
        async with AsyncSqliteSaver.from_conn_string(str(path)) as checkpointer:
            yield checkpointer
    else:
        conn_string = _postgres_conn_string(settings)
        async with AsyncPostgresSaver.from_conn_string(conn_string) as checkpointer:
            await checkpointer.setup()
            yield checkpointer
