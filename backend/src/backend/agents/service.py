"""Agent runtime with Postgres or SQLite checkpointer."""

from __future__ import annotations

import uuid
from contextlib import asynccontextmanager

from langchain_core.messages import HumanMessage
from langgraph.checkpoint.base import BaseCheckpointSaver

from backend.agents.checkpointer import checkpointer_lifespan
from backend.agents.graph import build_initial_message, create_issue_agent, extract_reply_text
from backend.db.chat_repository import fetch_chat_thread
from backend.db.chat_store import add_chat_message, create_chat_thread, touch_chat_thread
from backend.db.engine import get_session_maker
from backend.db.repository import fetch_issue


class AgentService:
    def __init__(self, checkpointer: BaseCheckpointSaver) -> None:
        self.checkpointer = checkpointer

    async def create_thread(
        self,
        user_id: uuid.UUID,
        *,
        title: str | None = None,
        owner: str | None = None,
        repo: str | None = None,
        number: int | None = None,
    ) -> tuple[str, dict | None]:
        thread_id = str(uuid.uuid4())
        issue_id = None
        issue_context = None

        if owner and repo and number is not None:
            full_name = f"{owner}/{repo}"
            async with get_session_maker()() as session:
                issue = await fetch_issue(session, full_name, number)
                if issue is not None:
                    issue_id = issue.id
                    issue_context = {
                        "full_name": full_name,
                        "number": number,
                        "title": issue.title,
                    }
            if title is None and issue_context:
                title = f"{full_name}#{number}"

        async with get_session_maker()() as session:
            await create_chat_thread(
                session,
                thread_id=thread_id,
                user_id=user_id,
                title=title,
                issue_id=issue_id,
            )

        if issue_context:
            seed = build_initial_message(issue_context)
            if seed is not None:
                agent = create_issue_agent(self.checkpointer, user_id, thread_id=thread_id)
                await agent.ainvoke(
                    {"messages": [seed]},
                    config={"configurable": {"thread_id": thread_id}},
                )

        return thread_id, issue_context

    async def send_message(
        self,
        user_id: uuid.UUID,
        thread_id: str,
        content: str,
    ) -> tuple[object, object]:
        async with get_session_maker()() as session:
            thread = await fetch_chat_thread(session, thread_id, user_id)
            if thread is None:
                raise LookupError("Chat thread not found")

        user_message = await self._persist_message(thread_id, "user", content)

        agent = create_issue_agent(self.checkpointer, user_id, thread_id=thread_id)
        result = await agent.ainvoke(
            {"messages": [HumanMessage(content=content)]},
            config={"configurable": {"thread_id": thread_id}},
        )
        reply_text = extract_reply_text(result["messages"])
        assistant_message = await self._persist_message(thread_id, "assistant", reply_text)

        async with get_session_maker()() as session:
            await touch_chat_thread(session, thread_id)

        return user_message, assistant_message

    async def _persist_message(self, thread_id: str, role: str, content: str):
        async with get_session_maker()() as session:
            return await add_chat_message(
                session,
                thread_id=thread_id,
                role=role,
                content=content,
            )


_agent_service: AgentService | None = None


@asynccontextmanager
async def agent_lifespan():
    global _agent_service
    async with checkpointer_lifespan() as checkpointer:
        _agent_service = AgentService(checkpointer)
        try:
            yield _agent_service
        finally:
            _agent_service = None


def get_agent_service() -> AgentService:
    if _agent_service is None:
        raise RuntimeError("Agent service is not initialized")
    return _agent_service
