"""Tests for small API helpers."""

from backend.api.deps import repo_full_name


def test_repo_full_name():
    assert repo_full_name("numpy", "numpy") == "numpy/numpy"
