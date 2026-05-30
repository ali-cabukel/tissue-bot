# backend

Python package for tissue-bot — async GitHub REST client, SQLAlchemy persistence, CLI, and HTTP API.

## Setup

```bash
cd backend
cp .env.template .env   # set SECRET_KEY and optionally GITHUB_TOKEN
uv venv && source .venv/bin/activate
uv sync
```

Auth: `GITHUB_TOKEN` in `.env`, or `gh auth login` (falls back to `gh auth token`).

Configuration: `src/backend/settings.py` (pydantic-settings).

### Linting

```bash
uv sync --group dev
ruff check src
ruff format src

# Or from repo root after `pre-commit install`:
pre-commit run --all-files
```

## CLI (`tissue`)

```bash
tissue init-db
tissue collect-repos repo numpy/numpy
tissue collect-issues numpy/numpy --state open --limit 50
tissue collect-tracked --issue-limit 50
```

## HTTP API (`tissue-api`)

```bash
tissue-api
# Open http://127.0.0.1:8000/docs
```

### Authentication (FastAPI Users + JWT)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Register user |
| POST | `/auth/jwt/login` | Login (form: username=email, password) |
| POST | `/auth/jwt/logout` | Logout |
| GET | `/users/me` | Current user |

All data routes require `Authorization: Bearer <token>`.

### Repositories

| Method | Path | Description |
|--------|------|-------------|
| POST | `/repos/{owner}/{repo}/collect` | Fetch from GitHub and store |
| GET | `/repos` | List stored repos |
| GET | `/repos/{owner}/{repo}` | Get stored repo |

### Issues

| Method | Path | Description |
|--------|------|-------------|
| POST | `/repos/{owner}/{repo}/issues/collect` | Fetch from GitHub and store |
| GET | `/repos/{owner}/{repo}/issues` | List stored issues |
| GET | `/repos/{owner}/{repo}/issues/{number}` | Get stored issue |

Query params for collect: `state` (open/closed), `limit`. For list: `state`, `limit`, `offset`.

### Agent chat & resolutions (LangGraph + Ollama)

Requires [Ollama](https://ollama.com/) running locally with a model pulled, e.g.:

```bash
ollama pull llama3.2
ollama serve
```

| Method | Path | Description |
|--------|------|-------------|
| POST | `/chat/threads` | Create chat thread (optional issue context) |
| GET | `/chat/threads` | List chat threads |
| GET | `/chat/threads/{id}/messages` | List messages |
| POST | `/chat/threads/{id}/messages` | Send message to agent |
| GET | `/resolutions` | List/search saved resolutions |
| GET | `/resolutions/{id}` | Get resolution |
| POST | `/repos/{owner}/{repo}/issues/{number}/resolve` | Run agent to propose local fix |

Agent tools search stored repos/issues and save resolutions locally (no GitHub PR yet).
Conversation state is checkpointed in SQLite (`backend/data/langgraph-checkpoints.db`).

### Example

```bash
curl -X POST http://127.0.0.1:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"your-secure-password"}'

TOKEN=$(curl -s -X POST http://127.0.0.1:8000/auth/jwt/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=you@example.com&password=your-secure-password" | jq -r .access_token)

curl -X POST http://127.0.0.1:8000/repos/numpy/numpy/collect \
  -H "Authorization: Bearer $TOKEN"

curl http://127.0.0.1:8000/repos/numpy/numpy \
  -H "Authorization: Bearer $TOKEN"
```

### Settings

| Variable | Default |
|----------|---------|
| `SECRET_KEY` | (required for production) |
| `CORS_ORIGINS` | `http://localhost:3000,http://localhost:8000` |
| `API_HOST` / `API_PORT` | `127.0.0.1` / `8000` |
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` |
| `OLLAMA_MODEL` | `llama3.2` |
| `CHECKPOINT_DB_PATH` | `backend/data/langgraph-checkpoints.db` |
| Database | `backend/data/tissue-bot.db` |

Shell script equivalents: `../scripts/`.
