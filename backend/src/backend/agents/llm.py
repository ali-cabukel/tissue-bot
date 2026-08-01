"""Chat model factory — Anthropic (Cloud Run) or Ollama (local)."""

from __future__ import annotations

from langchain_anthropic import ChatAnthropic
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_ollama import ChatOllama

from backend.settings import get_settings


def create_chat_model() -> BaseChatModel:
    settings = get_settings()
    provider = settings.resolved_llm_provider()
    if provider == "anthropic":
        return ChatAnthropic(
            model=settings.anthropic_model,
            api_key=settings.require_anthropic_api_key(),
            temperature=0.2,
        )
    if provider == "ollama":
        return ChatOllama(
            model=settings.ollama_model,
            base_url=settings.ollama_base_url,
            temperature=0.2,
        )
    raise RuntimeError(
        "No LLM provider configured. Set ANTHROPIC_API_KEY for Anthropic or "
        "LLM_PROVIDER=ollama with Ollama running locally."
    )
