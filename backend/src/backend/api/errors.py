"""Map GitHub client errors to HTTP responses."""

from __future__ import annotations

import httpx
from fastapi import HTTPException, status


def raise_github_http_error(exc: httpx.HTTPStatusError) -> None:
    code = exc.response.status_code
    if code == 404:
        detail = "Repository not found on GitHub."
    elif code in (401, 403):
        detail = "GitHub authentication failed. Set GITHUB_TOKEN."
    else:
        detail = f"GitHub API error ({code})."

    raise HTTPException(
        status_code=code if 400 <= code < 600 else status.HTTP_502_BAD_GATEWAY,
        detail=detail,
    ) from exc
