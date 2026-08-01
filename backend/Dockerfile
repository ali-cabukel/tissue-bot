FROM python:3.13-slim-bookworm AS base

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PYTHONUNBUFFERED=1 \
    API_HOST=0.0.0.0 \
    API_PORT=8000

WORKDIR /app/backend

RUN groupadd --system app \
    && useradd --system --gid app --home-dir /app --create-home app

COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY backend/ ./
COPY scripts/ /app/scripts/

RUN uv sync --frozen --no-dev \
    && mkdir -p data \
    && chown -R app:app /app

USER app

EXPOSE 8000

VOLUME ["/app/backend/data"]

CMD ["sh", "-c", "uv run tissue init-db && exec uv run tissue-api"]
