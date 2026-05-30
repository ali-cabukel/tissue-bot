.PHONY: help setup start-api lint test ollama-setup

ROOT_DIR := ..
OLLAMA_MODEL ?= llama3.2

help: ## Show available commands
	@grep -E '^[a-zA-Z0-9_-]+:.*##' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  %-14s %s\n", $$1, $$2}'

setup: ## Install backend deps, env file, pre-commit, and init DB
	@test -f .env || cp .env.template .env
	uv sync --group dev
	uv run tissue init-db
	cd $(ROOT_DIR) && pre-commit install

start-api: ## Run the FastAPI server (http://127.0.0.1:8000/docs)
	uv run tissue-api

lint: ## Run pre-commit hooks (Ruff + formatting checks)
	cd $(ROOT_DIR) && pre-commit run --all-files

test: ## Run backend unit tests
	uv run pytest

ollama-setup: ## Pull the default Ollama model for the issue-resolution agent
	ollama pull $(OLLAMA_MODEL)
