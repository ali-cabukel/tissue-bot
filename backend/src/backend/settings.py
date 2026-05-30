"""Application settings loaded from environment and .env file."""

from __future__ import annotations

import subprocess
from functools import lru_cache
from pathlib import Path

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[2]
REPO_ROOT = BACKEND_ROOT.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    github_token: SecretStr | None = Field(default=None, validation_alias="GITHUB_TOKEN")
    db_path: Path | None = Field(default=None, validation_alias="DB_PATH")
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
    cors_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:3000", "http://localhost:8000"],
        validation_alias="CORS_ORIGINS",
    )
    api_host: str = Field(default="127.0.0.1", validation_alias="API_HOST")
    api_port: int = Field(default=8000, validation_alias="API_PORT")
    api_reload: bool = Field(default=False, validation_alias="API_RELOAD")
    ollama_base_url: str = Field(
        default="http://127.0.0.1:11434",
        validation_alias="OLLAMA_BASE_URL",
    )
    ollama_model: str = Field(default="llama3.2", validation_alias="OLLAMA_MODEL")
    checkpoint_db_path: Path | None = Field(default=None, validation_alias="CHECKPOINT_DB_PATH")

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @property
    def schema_path(self) -> Path:
        return REPO_ROOT / "scripts" / "db" / "schema.sql"

    @property
    def resolved_db_path(self) -> Path:
        return self.db_path or BACKEND_ROOT / "data" / "tissue-bot.db"

    @property
    def resolved_tracked_repos_file(self) -> Path:
        return self.tracked_repos_file or REPO_ROOT / "scripts" / "config" / "scientific-repos.txt"

    @property
    def resolved_checkpoint_db_path(self) -> Path:
        return self.checkpoint_db_path or BACKEND_ROOT / "data" / "langgraph-checkpoints.db"

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
