"""FastAPI application factory."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.agents.service import agent_lifespan
from backend.api.routers import chat, issues, repos, resolutions
from backend.api.static_web import mount_static_web
from backend.auth.deps import auth_backend, fastapi_users
from backend.auth.models import User  # noqa: F401 — register user table
from backend.auth.schemas import UserCreate, UserRead, UserUpdate
from backend.db.engine import dispose_engine, get_engine
from backend.db.init_db import init_schema
from backend.settings import get_settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_schema(get_engine())
    async with agent_lifespan() as agent_service:
        app.state.agent_service = agent_service
        yield
    await dispose_engine()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="tissue-bot API",
        description="Collect and query GitHub repository and issue data.",
        version="0.1.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(
        fastapi_users.get_auth_router(auth_backend),
        prefix="/api/auth/jwt",
        tags=["auth"],
    )
    app.include_router(
        fastapi_users.get_register_router(UserRead, UserCreate),
        prefix="/api/auth",
        tags=["auth"],
    )
    app.include_router(
        fastapi_users.get_users_router(UserRead, UserUpdate),
        prefix="/api/users",
        tags=["users"],
    )
    app.include_router(repos.router, prefix="/api")
    app.include_router(issues.router, prefix="/api")
    app.include_router(chat.router, prefix="/api")
    app.include_router(resolutions.router, prefix="/api")

    @app.get("/health", tags=["health"])
    async def health() -> dict[str, str | bool]:
        settings = get_settings()
        return {
            "status": "ok",
            "llm_provider": settings.llm_provider,
            "llm_active": settings.resolved_llm_provider(),
            "anthropic_configured": settings.has_anthropic_api_key(),
            "anthropic_model": settings.anthropic_model,
            "ollama_base_url": settings.ollama_base_url,
            "ollama_model": settings.ollama_model,
            "database": "postgres" if not settings.is_sqlite else "sqlite",
            "database_schema": settings.database_schema,
        }

    mount_static_web(app, settings.static_dir_path)

    return app
