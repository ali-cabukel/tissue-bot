"""Tests for FastAPI application endpoints."""

from contextlib import asynccontextmanager
from unittest.mock import MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from backend.api.app import create_app


@asynccontextmanager
async def _fake_agent_lifespan():
    yield MagicMock()


@pytest.mark.asyncio
async def test_health_endpoint():
    with patch("backend.api.app.agent_lifespan", _fake_agent_lifespan):
        app = create_app()
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["database"] == "sqlite"


@pytest.mark.asyncio
async def test_repos_requires_authentication():
    with patch("backend.api.app.agent_lifespan", _fake_agent_lifespan):
        app = create_app()
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/repos")

    assert response.status_code == 401
