"""Tests for tracked scientific library collection."""

from pathlib import Path

from backend.collectors.tracked import load_tracked_repos


def test_load_tracked_repos_ignores_comments_and_blank_lines(tmp_path: Path) -> None:
    path = tmp_path / "repos.txt"
    path.write_text(
        "# Scientific libraries\n\nnumpy/numpy\n\n# pandas\npandas-dev/pandas\n",
        encoding="utf-8",
    )

    assert load_tracked_repos(path) == ["numpy/numpy", "pandas-dev/pandas"]
