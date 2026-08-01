"""Application settings loaded from environment and .env file."""

from __future__ import annotations

import subprocess
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, SecretStr, computed_field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[2]
REPO_ROOT = BACKEND_ROOT.parent

LlmProviderSetting = Literal["auto", "anthropic", "ollama"]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    github_token: SecretStr | None = Field(default=None, validation_alias="GITHUB_TOKEN")
    db_path: Path | None = Field(default=None, validation_alias="DB_PATH")
    database_url: str | None = Field(default=None, validation_alias="DATABASE_URL")
    database_schema: str = Field(default="", validation_alias="DATABASE_SCHEMA")
    github_api_base_url: str = Field(
        default="https://api.github.com",
        validation_alias="GITHUB_API_BASE_URL",
    )
    github_api_version: str = Field(
        default="2022-11-28",
        validation_alias="GITHUB_API_VERSION",
    )
    tracked_repos_file: Path | None = Field(
        default=None,
        validation_alias="TRACKED_REPOS_FILE",
    )
    secret_key: SecretStr = Field(
        default=SecretStr("change-me-in-production"),
        validation_alias="SECRET_KEY",
    )
    jwt_lifetime_seconds: int = Field(default=3600, validation_alias="JWT_LIFETIME_SECONDS")
    cors_origins_raw: str = Field(
        default="http://localhost:3000,http://localhost:8000",
        validation_alias="CORS_ORIGINS",
    )
    api_host: str = Field(default="127.0.0.1", validation_alias="API_HOST")
    api_port: int = Field(default=8000, validation_alias="API_PORT")
    api_reload: bool = Field(default=False, validation_alias="API_RELOAD")
    static_dir: str | None = Field(default=None, validation_alias="STATIC_DIR")
    llm_provider: LlmProviderSetting = Field(default="auto", validation_alias="LLM_PROVIDER")
    anthropic_api_key: SecretStr | None = Field(default=None, validation_alias="ANTHROPIC_API_KEY")
    anthropic_model: str = Field(
        default="claude-sonnet-4-20250514",
        validation_alias="ANTHROPIC_MODEL",
    )
    ollama_base_url: str = Field(
        default="http://127.0.0.1:11434",
        validation_alias="OLLAMA_BASE_URL",
    )
    ollama_model: str = Field(default="llama3.2", validation_alias="OLLAMA_MODEL")
    checkpoint_db_path: Path | None = Field(default=None, validation_alias="CHECKPOINT_DB_PATH")

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, value: str | None) -> str | None:
        if value is None:
            return None
        url = str(value).strip()
        if not url:
            return None
        if url.startswith("postgresql://"):
            return "postgresql+asyncpg://" + url.removeprefix("postgresql://")
        if url.startswith("postgres://"):
            return "postgresql+asyncpg://" + url.removeprefix("postgres://")
        return url

    @field_validator("database_schema", mode="before")
    @classmethod
    def normalize_database_schema(cls, value: str | None) -> str:
        if value is None:
            return ""
        return str(value).strip()

    @field_validator("static_dir", mode="before")
    @classmethod
    def empty_static_dir_is_none(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if isinstance(value, str) and not value.strip():
            return None
        return value.strip()

    @computed_field  # type: ignore[prop-decorator]
    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins_raw.split(",") if origin.strip()]

    @property
    def schema_path(self) -> Path:
        return REPO_ROOT / "scripts" / "db" / "schema.sql"

    @property
    def resolved_db_path(self) -> Path:
        return self.db_path or BACKEND_ROOT / "data" / "tissue-bot.db"

    @property
    def is_sqlite(self) -> bool:
        return self.resolved_database_url.startswith("sqlite")

    @property
    def resolved_database_url(self) -> str:
        if self.database_url:
            return self.database_url
        return f"sqlite+aiosqlite:///{self.resolved_db_path}"

    @property
    def sync_database_url(self) -> str:
        """Libpq/psycopg connection string for LangGraph Postgres checkpointer."""
        url = self.resolved_database_url
        if url.startswith("postgresql+asyncpg://"):
            return "postgresql://" + url.removeprefix("postgresql+asyncpg://")
        if url.startswith("postgresql+psycopg://"):
            return "postgresql://" + url.removeprefix("postgresql+psycopg://")
        if url.startswith("sqlite+aiosqlite:///"):
            return "sqlite:///" + url.removeprefix("sqlite+aiosqlite:///")
        return url

    @property
    def resolved_tracked_repos_file(self) -> Path:
        return self.tracked_repos_file or REPO_ROOT / "scripts" / "config" / "scientific-repos.txt"

    @property
    def resolved_checkpoint_db_path(self) -> Path:
        return self.checkpoint_db_path or BACKEND_ROOT / "data" / "langgraph-checkpoints.db"

    @property
    def static_dir_path(self) -> Path | None:
        if self.static_dir is None:
            return None
        return Path(self.static_dir)

    def has_anthropic_api_key(self) -> bool:
        if self.anthropic_api_key is None:
            return False
        return bool(self.anthropic_api_key.get_secret_value().strip())

    def require_anthropic_api_key(self) -> str:
        if not self.has_anthropic_api_key():
            raise RuntimeError(
                "ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic (or auto). "
                "Create one at https://console.anthropic.com/"
            )
        assert self.anthropic_api_key is not None
        return self.anthropic_api_key.get_secret_value().strip()

    def resolved_llm_provider(self) -> str | None:
        if self.llm_provider == "anthropic":
            return "anthropic" if self.has_anthropic_api_key() else None
        if self.llm_provider == "ollama":
            return "ollama"
        if self.has_anthropic_api_key():
            return "anthropic"
        return "ollama"

    def resolve_github_token(self) -> str:
        if self.github_token is not None:
            value = self.github_token.get_secret_value().strip()
            if value:
                return value
        try:
            result = subprocess.run(
                ["gh", "auth", "token"],
                capture_output=True,
                text=True,
                check=True,
            )
            token = result.stdout.strip()
            if token:
                return token
        except (FileNotFoundError, subprocess.CalledProcessError):
            pass
        raise RuntimeError(
            "GitHub token required. Set GITHUB_TOKEN in .env or run `gh auth login`."
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
