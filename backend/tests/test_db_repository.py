"""Tests for database read queries."""

import pytest

from backend.db.chat_repository import search_issues, search_repos
from backend.db.repository import fetch_issue, fetch_issues, fetch_repo, fetch_repos


@pytest.mark.asyncio
async def test_fetch_repos_orders_by_stars(seeded_data, db_session):
    second = seeded_data["repo"].__class__(
        owner="pandas",
        name="pandas",
        full_name="pandas-dev/pandas",
        description="Data analysis",
        url="https://github.com/pandas-dev/pandas",
        stars=10000,
        forks=500,
        language="Python",
        is_private=0,
        is_fork=0,
        is_archived=0,
        collected_at="2024-01-01 00:00:00",
    )
    db_session.add(second)
    await db_session.commit()

    repos = await fetch_repos(db_session)

    assert [repo.full_name for repo in repos] == ["pandas-dev/pandas", "numpy/numpy"]


@pytest.mark.asyncio
async def test_fetch_issue_and_issues(seeded_data, db_session):
    repo = seeded_data["repo"]
    issue = seeded_data["issue"]

    fetched = await fetch_issue(db_session, repo.full_name, issue.number)
    assert fetched is not None
    assert fetched.title == "dtype conversion bug"
    assert fetched.repo.full_name == "numpy/numpy"
    assert [label.label_name for label in fetched.labels] == ["bug"]

    open_issues = await fetch_issues(db_session, repo.full_name, state="open")
    assert len(open_issues) == 1

    closed_issues = await fetch_issues(db_session, repo.full_name, state="closed")
    assert closed_issues == []


@pytest.mark.asyncio
async def test_search_repos_and_issues(seeded_data, db_session):
    repo = seeded_data["repo"]

    repos = await search_repos(db_session, "array")
    assert len(repos) == 1
    assert repos[0].full_name == repo.full_name

    issues = await search_issues(db_session, "dtype", full_name=repo.full_name)
    assert len(issues) == 1
    assert issues[0].number == 42

    missing = await search_issues(db_session, "nonexistent")
    assert missing == []


@pytest.mark.asyncio
async def test_fetch_repo_returns_none_for_missing(db_session):
    assert await fetch_repo(db_session, "missing/repo") is None
