# backend

Python package for tissue-bot — async GitHub REST client, SQLAlchemy persistence, and CLI.

## Setup

```bash
cd backend
cp .env.template .env   # optional: set GITHUB_TOKEN
uv venv && source .venv/bin/activate
uv sync
```

Auth: `GITHUB_TOKEN` in `.env`, or `gh auth login` (falls back to `gh auth token`).

Configuration: `src/backend/settings.py` (pydantic-settings).

CLI built with **Click** and **Rich** for formatted output.

## CLI

```bash
tissue init-db
tissue collect-repos repo numpy/numpy
tissue collect-issues numpy/numpy --state open --limit 50
tissue collect-tracked --issue-limit 50
```

Default paths (overridable via `.env`):

| Setting | Default |
|---------|---------|
| Database | `backend/data/tissue-bot.db` |
| Schema | `scripts/db/schema.sql` |
| Tracked repos | `scripts/config/scientific-repos.txt` |

Shell script equivalents: `../scripts/`.
