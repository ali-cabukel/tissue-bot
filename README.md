# tissue-bot

Agentic system for collecting GitHub repository and issue data, storing it locally, and analysing/resolving issues with agents.

## Quick start

```bash
cd backend
cp .env.template .env          # optional: set GITHUB_TOKEN
uv venv && source .venv/bin/activate && uv sync

tissue init-db
tissue collect-tracked --issue-limit 50

# HTTP API
tissue-api   # http://127.0.0.1:8000/docs

# Web UI
cd ../frontend && cp .env.local.example .env.local && npm install && npm run dev
# http://localhost:3000

# Or shell scripts from repo root
chmod +x scripts/*.sh
./scripts/init-db.sh
./scripts/collect-tracked-repos.sh --issue-limit 50
```

## Layout

```
tissue-bot/
├── backend/                 # Python package + data + secrets
│   ├── .env.template
│   ├── data/                # SQLite database (gitignored)
│   ├── pyproject.toml
│   └── src/backend/
├── frontend/                # Next.js web UI
│   ├── .env.local.example
│   └── src/
└── scripts/                 # shell scripts, config, schema, docs
    ├── *.sh
    ├── config/scientific-repos.txt
    ├── db/schema.sql
    └── docs/gh-cli-examples.md
```

## Tracked repos

Scientific Python libraries — `scripts/config/scientific-repos.txt`.

## Documentation

- [backend/README.md](backend/README.md) — Python CLI
- [frontend/README.md](frontend/README.md) — Next.js web UI
- [scripts/docs/gh-cli-examples.md](scripts/docs/gh-cli-examples.md) — gh CLI cookbook

## Development

```bash
cd backend
uv sync --group dev
pre-commit install   # from repo root
pre-commit run --all-files
```

Linting uses [Ruff](https://docs.astral.sh/ruff/) on `backend/src/` via pre-commit hooks.

```bash
cd backend && uv sync --group dev && pytest
```

## LLM / agent

Issue-resolution chat uses **Anthropic** (Cloud Run) or **Ollama** (local) via LangGraph:

| `LLM_PROVIDER` | Behaviour |
|----------------|-----------|
| `auto` (default) | Anthropic when `ANTHROPIC_API_KEY` is set, otherwise Ollama |
| `anthropic` | Requires `ANTHROPIC_API_KEY` |
| `ollama` | Local Ollama server (`OLLAMA_BASE_URL`, default `http://127.0.0.1:11434`) |

## Database

SQLite (`backend/data/tissue-bot.db`) by default, or **Postgres / Supabase** when `DATABASE_URL` is set:

```bash
# Local Supabase stack (Postgres + Studio)
docker compose -f docker-compose.yml -f docker-compose.supabase.yml up --build

# Production — point at Supabase (database name must be postgres)
DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres
DATABASE_SCHEMA=tissue-bot
```

LangGraph checkpoints use the same Postgres instance (schema isolation via `DATABASE_SCHEMA`).

## Docker

| Mode | Command | URLs |
| ---- | ------- | ---- |
| **Split** (default) | `docker compose up --build` | API `:8000`, UI `:3000` |
| **Split + Postgres** | `docker compose -f docker-compose.yml -f docker-compose.supabase.yml up --build` | API `:8000`, UI `:3000`, Studio `:54323` |
| **Bundled** (Cloud Run-style) | `docker compose -f docker-compose.bundled.yml up --build` | App `:8000` (FastAPI + static UI) |
| **Bundled + Postgres** | `docker compose -f docker-compose.bundled.yml -f docker-compose.supabase.yml up --build` | App `:8000`, Studio `:54323` |

Split mode keeps Next.js on its own port for future scaling. Bundled mode serves the Next.js static export from FastAPI (`STATIC_DIR`).

## Cloud Run

Push to `main` triggers `.github/workflows/deploy.yml` (bundled root `Dockerfile`).

| Workflow | Trigger | Purpose |
| -------- | ------- | ------- |
| `deploy.yml` | Push to `main` | Build image, deploy Cloud Run service + `tissue-collect-tracked` job |
| `collect-tracked.yml` | Daily 04:00 UTC, manual | Execute the scientific library collection job |

After the first deploy, run **Collect tracked repos** manually in GitHub Actions (or wait for the nightly schedule) to populate repositories.

Before first deploy:

1. Add `ali-cabukel/tissue-bot` to GitHub WIF provider
2. Create GCP secrets: `SECRET`, `ANTHROPIC_API_KEY`, `DATABASE_URL`, `GITHUB_TOKEN`
3. Deploy sets `DATABASE_SCHEMA=tissue-bot`, `LLM_PROVIDER=anthropic`, `STATIC_DIR=/app/static`

The collection job runs:

```bash
tissue init-db
tissue collect-tracked --issue-limit 50
```

Tracked repos are read from `scripts/config/scientific-repos.txt` (bundled in the Docker image at `/app/scripts/config/scientific-repos.txt`).

## Roadmap

- [x] gh CLI scripts + SQLite schema
- [x] Tracked scientific library repos
- [x] Python backend (uv + httpx + SQLAlchemy async + FastAPI)
- [x] Next.js frontend (auth, repos & issues tables, collect/scrape)
- [x] LangGraph issue-resolution agent (Ollama / Anthropic + Postgres checkpointer)
- [ ] GitHub commit/PR cycle for saved resolutions
- [ ] Analysis agent with visualisations
- [ ] Issue resolution agent
