# tissue-bot frontend

Next.js web UI for the tissue-bot API.

## Setup

```bash
cd frontend
cp .env.local.example .env.local
npm install
```

Ensure the backend API is running:

```bash
cd ../backend
source .venv/bin/activate
tissue-api   # http://127.0.0.1:8000
```

## Development

```bash
npm run dev   # http://localhost:3000
```

## Features

- **Register / log in** — JWT stored in `localStorage` (`tissue_token`)
- **Repositories** — collect from GitHub, list stored repos in a table
- **Issues** — per-repo issue collection, search, body modal, resolve/chat actions
- **Agent chat** — LangGraph assistant at `/chat` to search data and save local resolutions

## Agent chat

Requires Ollama running with the model configured in backend `.env` (default `llama3.2`):

```bash
ollama pull llama3.2
ollama serve
```

Use **Agent chat** in the navbar or click **Resolve** / **Chat** on an issue row.

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://127.0.0.1:8000` | tissue-api base URL |

CORS must allow `http://localhost:3000` (default in `backend/.env.template`).
