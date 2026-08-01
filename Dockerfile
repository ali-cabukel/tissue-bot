# syntax=docker/dockerfile:1
# Cloud Run bundle: Next.js static export + FastAPI on one port.

FROM node:22-alpine AS web

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./

ENV NEXT_OUTPUT=export
ENV NEXT_PUBLIC_API_URL=

RUN npm run build

FROM python:3.13-slim AS api

WORKDIR /app/backend

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Install dependencies first (cached layer), then the local package with full sources.
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY backend/README.md ./
COPY backend/src ./src
COPY scripts /app/scripts
RUN uv sync --frozen --no-dev

COPY --from=web /app/frontend/out /app/static

ENV API_HOST=0.0.0.0
ENV API_PORT=8000
ENV STATIC_DIR=/app/static
ENV CORS_ORIGINS=http://localhost:8000,http://127.0.0.1:8000
ENV LLM_PROVIDER=anthropic
ENV DATABASE_SCHEMA=tissue-bot

RUN mkdir -p /app/backend/data

EXPOSE 8000

CMD ["sh", "-c", "uv run tissue init-db && exec uv run tissue-api"]
