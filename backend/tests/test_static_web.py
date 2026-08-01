"""Tests for static web fallback routing."""

from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.api.static_web import mount_static_web


def test_repo_issues_path_serves_export_shell(tmp_path: Path) -> None:
    static_dir = tmp_path / "static"
    issues_page = static_dir / "repos" / "_" / "_" / "issues.html"
    issues_page.parent.mkdir(parents=True)
    issues_page.write_text("<html><body>issues shell</body></html>", encoding="utf-8")

    app = FastAPI()
    mount_static_web(app, static_dir)
    client = TestClient(app)

    response = client.get("/repos/pytorch/pytorch/issues")

    assert response.status_code == 200
    assert "issues shell" in response.text
