"""Tests for agent helper functions."""

from langchain_core.messages import AIMessage, HumanMessage

from backend.agents.graph import build_initial_message, extract_reply_text


def test_extract_reply_text_from_string_content():
    messages = [HumanMessage(content="Hi"), AIMessage(content="Hello there")]

    assert extract_reply_text(messages) == "Hello there"


def test_extract_reply_text_from_block_content():
    messages = [
        AIMessage(content=[{"type": "text", "text": "Line one"}, "Line two"]),
    ]

    assert extract_reply_text(messages) == "Line one\nLine two"


def test_extract_reply_text_fallback_when_no_ai_message():
    messages = [HumanMessage(content="Hi")]

    assert extract_reply_text(messages) == "I couldn't generate a response."


def test_build_initial_message_includes_issue_context():
    message = build_initial_message(
        {"full_name": "numpy/numpy", "number": 42, "title": "dtype bug"}
    )

    assert message is not None
    assert "numpy/numpy#42" in message.content
    assert "dtype bug" in message.content


def test_build_initial_message_returns_none_without_context():
    assert build_initial_message(None) is None
