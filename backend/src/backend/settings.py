"""Application settings loaded from environment and .env file."""

from __future__ import annotations

import subprocess
from functools import lru_cache
from pathlib import Path

from pydantic import Field, SecretStr
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

    @property
    def schema_path(self) -> Path:
        return REPO_ROOT / "scripts" / "db" / "schema.sql"

    @property
    def resolved_db_path(self) -> Path:
        return self.db_path or BACKEND_ROOT / "data" / "tissue-bot.db"

    @property
    def resolved_tracked_repos_file(self) -> Path:
        return (
            self.tracked_repos_file
            or REPO_ROOT / "scripts" / "config" / "scientific-repos.txt"
        )

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
