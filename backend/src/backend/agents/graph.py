"""LangGraph ReAct agent for issue analysis and resolution."""

from __future__ import annotations

import uuid

from langchain_core.messages import AIMessage, HumanMessage
from langchain_ollama import ChatOllama
from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.prebuilt import create_react_agent

from backend.agents.tools import build_tools
from backend.settings import get_settings

SYSTEM_PROMPT = """You are tissue-bot, an assistant for analyzing GitHub repositories and issues stored locally.

You can:
- Search collected repositories and issues
- Read full issue details
- Propose fixes for GitHub issues and save resolutions locally
- List previously saved resolutions

When asked to resolve an issue:
1. Use get_stored_issue to read the issue and repository context
2. Analyze the root cause and propose a concrete fix (steps, code snippets, or configuration changes)
3. Save the resolution with save_issue_resolution

Resolutions are stored locally only. Do not claim to have created GitHub commits or pull requests.

Use tools to look up data instead of guessing. Be concise and practical."""


def create_issue_agent(
    checkpointer: BaseCheckpointSaver,
    user_id: uuid.UUID,
    thread_id: str | None = None,
):
    settings = get_settings()
    model = ChatOllama(
        model=settings.ollama_model,
        base_url=settings.ollama_base_url,
        temperature=0.2,
    )
    tools = build_tools(user_id, thread_id=thread_id)
    return create_react_agent(
        model,
        tools,
        prompt=SYSTEM_PROMPT,
        checkpointer=checkpointer,
    )


def extract_reply_text(messages: list) -> str:
    for message in reversed(messages):
        if isinstance(message, AIMessage):
            content = message.content
            if isinstance(content, str):
                return content
            if isinstance(content, list):
                parts = []
                for block in content:
                    if isinstance(block, str):
                        parts.append(block)
                    elif isinstance(block, dict) and block.get("type") == "text":
                        parts.append(str(block.get("text", "")))
                return "\n".join(part for part in parts if part)
    return "I couldn't generate a response."


def build_initial_message(issue_context: dict | None) -> HumanMessage | None:
    if not issue_context:
        return None
    full_name = issue_context["full_name"]
    number = issue_context["number"]
    title = issue_context.get("title", "")
    return HumanMessage(
        content=(
            f"Context: we are discussing issue {full_name}#{number}"
            + (f" — {title}" if title else "")
            + ". Help analyze it and propose a local resolution when asked."
        )
    )
