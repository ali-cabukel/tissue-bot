"""Tests for API response schemas."""

from types import SimpleNamespace

from backend.api.schemas import ChatMessageOut, IssueOut, RepoOut
from backend.db.models import ChatMessage, IssueLabel


def test_repo_out_parses_topics_json_and_booleans():
    row = SimpleNamespace(
        id=1,
        owner="numpy",
        name="numpy",
        full_name="numpy/numpy",
        description="Array library",
        url="https://github.com/numpy/numpy",
        stars=100,
        forks=20,
        language="Python",
        is_private=1,
        is_fork=0,
        is_archived=0,
        license_key="bsd-3-clause",
        default_branch="main",
        created_at="2024-01-01",
        updated_at="2024-01-02",
        pushed_at="2024-01-03",
        topics='["python"]',
        collected_at="2024-01-04",
    )

    repo = RepoOut.model_validate(row)

    assert repo.is_private is True
    assert repo.is_fork is False
    assert repo.license == "bsd-3-clause"
    assert repo.topics == ["python"]


def test_issue_out_parses_label_objects():
    row = SimpleNamespace(
        id=1,
        repo_id=1,
        number=42,
        title="Bug",
        state="OPEN",
        body="Body",
        author="alice",
        url="https://example.com/issues/42",
        labels=[IssueLabel(issue_id=1, label_name="bug")],
        created_at="2024-01-01",
        updated_at="2024-01-02",
        collected_at="2024-01-03",
    )

    issue = IssueOut.model_validate(row)

    assert issue.labels == ["bug"]


def test_chat_message_out_from_orm():
    message = ChatMessage(
        id=1,
        thread_id="thread-1",
        role="assistant",
        content="Hello",
        created_at="2024-01-01",
    )

    out = ChatMessageOut.model_validate(message)

    assert out.thread_id == "thread-1"
    assert out.role == "assistant"
    assert out.content == "Hello"
