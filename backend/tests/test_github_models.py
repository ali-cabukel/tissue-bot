"""Tests for GitHub API normalization models."""

from backend.github.models import IssueRecord, RepoRecord


def test_repo_record_from_api():
    record = RepoRecord.from_api(
        {
            "name": "numpy",
            "owner": {"login": "numpy"},
            "full_name": "numpy/numpy",
            "description": "Array computing",
            "html_url": "https://github.com/numpy/numpy",
            "stargazers_count": 5000,
            "forks_count": 900,
            "language": "Python",
            "private": False,
            "fork": False,
            "archived": False,
            "license": {"key": "bsd-3-clause"},
            "default_branch": "main",
        },
        topics=["python", "science"],
    )

    assert record.full_name == "numpy/numpy"
    assert record.stars == 5000
    assert record.license == "bsd-3-clause"
    assert record.topics == ["python", "science"]
    assert record.topics_json == '["python", "science"]'


def test_issue_record_from_api_normalizes_state_and_labels():
    record = IssueRecord.from_api(
        {
            "number": 42,
            "title": "dtype bug",
            "state": "open",
            "body": "details",
            "user": {"login": "alice"},
            "html_url": "https://github.com/numpy/numpy/issues/42",
            "labels": [{"name": "bug"}, "help wanted"],
        }
    )

    assert record.number == 42
    assert record.state == "OPEN"
    assert record.author == "alice"
    assert record.labels == ["bug", "help wanted"]
