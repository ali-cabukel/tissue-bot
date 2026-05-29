"""Normalized Pydantic models matching the SQLite schema."""

from __future__ import annotations

import json
from typing import Any, Self

from pydantic import BaseModel, ConfigDict, Field, field_validator


class RepoRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    owner: str
    name: str
    full_name: str
    description: str | None = None
    url: str
    stars: int = 0
    forks: int = 0
    language: str | None = None
    is_private: bool = False
    is_fork: bool = False
    is_archived: bool = False
    license: str | None = None
    default_branch: str | None = None
    created_at: str | None = None
    updated_at: str | None = None
    pushed_at: str | None = None
    topics: list[str] = Field(default_factory=list)

    @property
    def topics_json(self) -> str:
        return json.dumps(self.topics)

    @classmethod
    def from_api(cls, data: dict[str, Any], topics: list[str] | None = None) -> Self:
        owner = data.get("owner") or {}
        license_info = data.get("license") or {}
        owner_login = owner.get("login") or data.get("full_name", "").split("/")[0]
        return cls(
            owner=owner_login,
            name=data["name"],
            full_name=data.get("full_name") or f"{owner_login}/{data['name']}",
            description=data.get("description"),
            url=data.get("html_url") or data.get("url", ""),
            stars=int(data.get("stargazers_count") or data.get("stargazersCount") or 0),
            forks=int(data.get("forks_count") or data.get("forksCount") or 0),
            language=data.get("language"),
            is_private=bool(data.get("private") or data.get("isPrivate")),
            is_fork=bool(data.get("fork") or data.get("isFork")),
            is_archived=bool(data.get("archived") or data.get("isArchived")),
            license=license_info.get("key") if license_info else None,
            default_branch=data.get("default_branch"),
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at"),
            pushed_at=data.get("pushed_at"),
            topics=topics if topics is not None else data.get("topics") or [],
        )


class IssueRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    number: int
    title: str
    state: str
    body: str | None = None
    author: str | None = None
    url: str
    created_at: str | None = None
    updated_at: str | None = None
    labels: list[str] = Field(default_factory=list)

    @field_validator("state", mode="before")
    @classmethod
    def normalize_state(cls, value: str) -> str:
        normalized = str(value).upper()
        if normalized in {"OPEN", "CLOSED"}:
            return normalized
        return normalized

    @classmethod
    def from_api(cls, data: dict[str, Any]) -> Self:
        user = data.get("user") or data.get("author") or {}
        labels = data.get("labels") or []
        label_names = [
            label["name"] if isinstance(label, dict) else str(label) for label in labels
        ]
        return cls(
            number=int(data["number"]),
            title=data["title"],
            state=data.get("state", "open"),
            body=data.get("body"),
            author=user.get("login"),
            url=data.get("html_url") or data.get("url", ""),
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at"),
            labels=label_names,
        )
