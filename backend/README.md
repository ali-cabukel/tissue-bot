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
| Database | `backend/data/tissue-bot.db` |

Shell script equivalents: `../scripts/`.
