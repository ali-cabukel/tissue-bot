# tissue-bot

Agentic system for collecting GitHub repository and issue data, storing it locally in SQLite, and analysing/resolving issues with agents.

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

## Roadmap

- [x] gh CLI scripts + SQLite schema
- [x] Tracked scientific library repos
- [x] Python backend (uv + httpx + SQLAlchemy async + FastAPI)
- [x] Next.js frontend (auth, repos & issues tables, collect/scrape)
- [x] LangGraph issue-resolution agent (Ollama + SQLite checkpointer)
- [ ] GitHub commit/PR cycle for saved resolutions
- [ ] Analysis agent with visualisations
- [ ] Issue resolution agent
