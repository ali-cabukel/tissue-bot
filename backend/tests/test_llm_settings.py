"""Tests for LLM provider selection."""

from backend.settings import Settings


def test_auto_prefers_anthropic_when_key_set():
    settings = Settings(
        LLM_PROVIDER="auto",
        ANTHROPIC_API_KEY="test-key",
    )
    assert settings.resolved_llm_provider() == "anthropic"


def test_auto_falls_back_to_ollama_without_key():
    settings = Settings(LLM_PROVIDER="auto")
    assert settings.resolved_llm_provider() == "ollama"


def test_anthropic_requires_key():
    settings = Settings(LLM_PROVIDER="anthropic")
    assert settings.resolved_llm_provider() is None


def test_ollama_explicit():
    settings = Settings(LLM_PROVIDER="ollama")
    assert settings.resolved_llm_provider() == "ollama"
