"""Async GitHub REST API client using httpx."""

from __future__ import annotations

from typing import Any, AsyncIterator, Literal

import httpx

IssueState = Literal["open", "closed", "all"]


class GitHubClient:
    def __init__(self, token: str, *, base_url: str = "https://api.github.com") -> None:
        self._client = httpx.AsyncClient(
            base_url=base_url,
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {token}",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            timeout=httpx.Timeout(30.0),
        )

    async def __aenter__(self) -> GitHubClient:
        return self

    async def __aexit__(self, *args: object) -> None:
        await self.close()

    async def close(self) -> None:
        await self._client.aclose()

    async def _get_paginated(
        self,
        path: str,
        *,
        params: dict[str, Any] | None = None,
        limit: int | None = None,
        items_key: str | None = None,
    ) -> list[dict[str, Any]]:
        params = dict(params or {})
        params.setdefault("per_page", min(limit or 100, 100))
        page = 1
        collected: list[dict[str, Any]] = []

        while True:
            params["page"] = page
            response = await self._client.get(path, params=params)
            response.raise_for_status()
            payload = response.json()

            if items_key:
                batch = payload.get(items_key, [])
            elif isinstance(payload, list):
                batch = payload
            else:
                batch = [payload]

            if not batch:
                break

            if limit is not None:
                remaining = limit - len(collected)
                collected.extend(batch[:remaining])
                if len(collected) >= limit:
                    break
            else:
                collected.extend(batch)

            if len(batch) < params["per_page"]:
                break
            page += 1

        return collected

    async def get_authenticated_user(self) -> str:
        response = await self._client.get("/user")
        response.raise_for_status()
        return response.json()["login"]

    async def get_repo(self, full_name: str) -> dict[str, Any]:
        owner, repo = full_name.split("/", 1)
        response = await self._client.get(f"/repos/{owner}/{repo}")
        response.raise_for_status()
        data = response.json()
        data["topics"] = await self.get_repo_topics(owner, repo)
        return data

    async def get_repo_topics(self, owner: str, repo: str) -> list[str]:
        response = await self._client.get(
            f"/repos/{owner}/{repo}/topics",
            headers={"Accept": "application/vnd.github+json"},
        )
        if response.status_code == 404:
            return []
        response.raise_for_status()
        return response.json().get("names", [])

    async def list_user_repos(self, username: str, *, limit: int = 100) -> list[dict[str, Any]]:
        repos = await self._get_paginated(
            f"/users/{username}/repos",
            params={"type": "all", "sort": "updated"},
            limit=limit,
        )
        return await self._attach_topics(repos)

    async def list_org_repos(self, org: str, *, limit: int = 100) -> list[dict[str, Any]]:
        repos = await self._get_paginated(
            f"/orgs/{org}/repos",
            params={"type": "all", "sort": "updated"},
            limit=limit,
        )
        return await self._attach_topics(repos)

    async def search_repos(self, query: str, *, limit: int = 100) -> list[dict[str, Any]]:
        return await self._get_paginated(
            "/search/repositories",
            params={"q": query, "sort": "stars", "order": "desc"},
            limit=limit,
            items_key="items",
        )

    async def list_issues(
        self,
        full_name: str,
        *,
        state: IssueState = "open",
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        owner, repo = full_name.split("/", 1)
        collected: list[dict[str, Any]] = []
        page = 1
        per_page = min(100, max(limit, 30))

        while len(collected) < limit:
            response = await self._client.get(
                f"/repos/{owner}/{repo}/issues",
                params={
                    "state": state,
                    "sort": "updated",
                    "direction": "desc",
                    "per_page": per_page,
                    "page": page,
                },
            )
            response.raise_for_status()
            batch = response.json()
            if not batch:
                break

            for item in batch:
                if "pull_request" in item:
                    continue
                collected.append(item)
                if len(collected) >= limit:
                    break

            if len(batch) < per_page:
                break
            page += 1

        return collected[:limit]

    async def _attach_topics(self, repos: list[dict[str, Any]]) -> list[dict[str, Any]]:
        for repo in repos:
            owner = repo["owner"]["login"]
            name = repo["name"]
            repo["topics"] = await self.get_repo_topics(owner, name)
        return repos

    async def iter_tracked_repos(self, path: str) -> AsyncIterator[str]:
        from pathlib import Path

        for line in Path(path).read_text(encoding="utf-8").splitlines():
            line = line.split("#", 1)[0].strip()
            if line:
                yield line
