"""Pydantic schemas for the HTTP API."""

from __future__ import annotations

import json

from pydantic import BaseModel, ConfigDict, Field, field_validator


class RepoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int
    owner: str
    name: str
    full_name: str
    description: str | None
    url: str
    stars: int
    forks: int
    language: str | None
    is_private: bool
    is_fork: bool
    is_archived: bool
    license: str | None = Field(validation_alias="license_key")
    default_branch: str | None
    created_at: str | None
    updated_at: str | None
    pushed_at: str | None
    topics: list[str] = Field(default_factory=list)
    collected_at: str

    @field_validator("topics", mode="before")
    @classmethod
    def parse_topics(cls, value: str | list[str] | None) -> list[str]:
        if value is None:
            return []
        if isinstance(value, list):
            return value
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, list) else []
        except json.JSONDecodeError:
            return []

    @field_validator("is_private", "is_fork", "is_archived", mode="before")
    @classmethod
    def int_to_bool(cls, value: int | bool) -> bool:
        return bool(value)


class IssueOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int
    repo_id: int
    number: int
    title: str
    state: str
    body: str | None
    author: str | None
    url: str
    labels: list[str] = Field(default_factory=list)
    created_at: str | None
    updated_at: str | None
    collected_at: str

    @field_validator("labels", mode="before")
    @classmethod
    def labels_from_orm(cls, value: list) -> list[str]:
        if not value:
            return []
        if isinstance(value[0], str):
            return value
        return [label.label_name for label in value]


class CollectResult(BaseModel):
    full_name: str
    collected: int
    message: str


class TrackedRepoOut(BaseModel):
    full_name: str
    collected: bool


class TrackedReposOut(BaseModel):
    source_file: str
    items: list[TrackedRepoOut]
    count: int


class CollectTrackedResult(BaseModel):
    collected: int
    message: str


class PaginatedRepos(BaseModel):
    items: list[RepoOut]
    limit: int
    offset: int
    count: int


class PaginatedIssues(BaseModel):
    items: list[IssueOut]
    full_name: str
    limit: int
    offset: int
    count: int


class ChatThreadCreate(BaseModel):
    title: str | None = None
    owner: str | None = None
    repo: str | None = None
    number: int | None = None


class ChatThreadOut(BaseModel):
    id: str
    title: str | None
    issue_full_name: str | None = None
    issue_number: int | None = None
    created_at: str
    updated_at: str


class ChatMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    thread_id: str
    role: str
    content: str
    created_at: str


class ChatMessageCreate(BaseModel):
    content: str = Field(min_length=1)


class ChatReplyOut(BaseModel):
    thread_id: str
    message: ChatMessageOut
    reply: ChatMessageOut


class ResolutionOut(BaseModel):
    id: int
    issue_id: int
    full_name: str
    issue_number: int
    issue_title: str
    status: str
    summary: str | None
    proposed_fix: str | None
    analysis: str | None
    thread_id: str | None
    created_at: str
    updated_at: str


class PaginatedResolutions(BaseModel):
    items: list[ResolutionOut]
    count: int
