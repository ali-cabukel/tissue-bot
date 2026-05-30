"""LangGraph tools backed by local SQLite data."""

from __future__ import annotations

import json
import uuid

from langchain_core.tools import tool

from backend.db.chat_repository import search_issues, search_repos
from backend.db.chat_store import create_issue_resolution
from backend.db.engine import get_session_maker
from backend.db.repository import fetch_issue, fetch_repo


def _issue_to_dict(issue) -> dict:
    return {
        "full_name": issue.repo.full_name,
        "number": issue.number,
        "title": issue.title,
        "state": issue.state,
        "author": issue.author,
        "labels": [label.label_name for label in issue.labels],
        "url": issue.url,
        "body": issue.body,
        "created_at": issue.created_at,
        "updated_at": issue.updated_at,
    }


def _repo_to_dict(repo) -> dict:
    return {
        "full_name": repo.full_name,
        "description": repo.description,
        "language": repo.language,
        "stars": repo.stars,
        "forks": repo.forks,
        "url": repo.url,
        "topics": json.loads(repo.topics) if repo.topics else [],
    }


def build_tools(user_id: uuid.UUID, thread_id: str | None = None):
    uid = user_id
    active_thread_id = thread_id

    @tool
    async def search_stored_repos(query: str, limit: int = 20) -> str:
        """Search collected repositories by name, description, language, or topics."""
        async with get_session_maker()() as session:
            repos = await search_repos(session, query, limit=min(limit, 50))
        if not repos:
            return f"No repositories matched '{query}'."
        return json.dumps([_repo_to_dict(repo) for repo in repos], indent=2)

    @tool
    async def search_stored_issues(
        query: str,
        repo: str | None = None,
        state: str | None = None,
        limit: int = 20,
    ) -> str:
        """Search stored GitHub issues by title, body, author, labels, or state."""
        async with get_session_maker()() as session:
            issues = await search_issues(
                session,
                query,
                full_name=repo,
                state=state.upper() if state else None,
                limit=min(limit, 50),
            )
            if not issues:
                return f"No issues matched '{query}'."
            payload = []
            for issue in issues:
                item = _issue_to_dict(issue)
                item["body"] = (issue.body or "")[:500]
                payload.append(item)
        return json.dumps(payload, indent=2)

    @tool
    async def get_stored_issue(owner: str, repo: str, number: int) -> str:
        """Get full details for a stored issue including body and labels."""
        full_name = f"{owner}/{repo}"
        async with get_session_maker()() as session:
            issue = await fetch_issue(session, full_name, number)
            if issue is None:
                return f"Issue {full_name}#{number} is not in the local database."
            repo_row = await fetch_repo(session, full_name)
            payload = _issue_to_dict(issue)
            if repo_row:
                payload["repository"] = _repo_to_dict(repo_row)
        return json.dumps(payload, indent=2)

    @tool
    async def save_issue_resolution(
        owner: str,
        repo: str,
        number: int,
        summary: str,
        proposed_fix: str,
        analysis: str = "",
    ) -> str:
        """Save a locally proposed fix for an issue. Does not create GitHub commits or PRs."""
        full_name = f"{owner}/{repo}"
        async with get_session_maker()() as session:
            issue = await fetch_issue(session, full_name, number)
            if issue is None:
                return f"Cannot save resolution: {full_name}#{number} not found locally."
            resolution = await create_issue_resolution(
                session,
                issue_id=issue.id,
                user_id=uid,
                summary=summary,
                proposed_fix=proposed_fix,
                analysis=analysis or None,
                thread_id=active_thread_id,
            )
        return (
            f"Saved local resolution #{resolution.id} for {full_name}#{number}. "
            "No GitHub commit or PR was created."
        )

    @tool
    async def list_saved_resolutions(
        query: str = "",
        owner: str | None = None,
        repo: str | None = None,
        limit: int = 20,
    ) -> str:
        """List saved issue resolutions, optionally filtered by text or repository."""
        from backend.db.chat_repository import fetch_resolutions

        full_name = f"{owner}/{repo}" if owner and repo else None
        async with get_session_maker()() as session:
            resolutions = await fetch_resolutions(
                session,
                uid,
                query=query or None,
                full_name=full_name,
                limit=min(limit, 50),
            )
            if not resolutions:
                return "No saved resolutions found."
            payload = []
            for row in resolutions:
                issue = row.issue
                payload.append(
                    {
                        "id": row.id,
                        "full_name": issue.repo.full_name,
                        "number": issue.number,
                        "title": issue.title,
                        "status": row.status,
                        "summary": row.summary,
                        "proposed_fix": (row.proposed_fix or "")[:1000],
                        "analysis": (row.analysis or "")[:1000],
                        "created_at": row.created_at,
                    }
                )
        return json.dumps(payload, indent=2)

    return [
        search_stored_repos,
        search_stored_issues,
        get_stored_issue,
        save_issue_resolution,
        list_saved_resolutions,
    ]
