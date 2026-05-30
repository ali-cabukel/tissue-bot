"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

import { ProtectedRoute } from "@/components/protected-route";
import * as api from "@/lib/api";
import type { ChatMessage, ChatThread, Resolution } from "@/lib/types";
import { ApiError } from "@/lib/types";

interface ChatPageProps {
  initialOwner?: string;
  initialRepo?: string;
  initialNumber?: number;
  initialThreadId?: string;
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-4 py-3 text-sm whitespace-pre-wrap ${
          isUser
            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
            : "border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}

export function ChatPageContent({
  initialOwner,
  initialRepo,
  initialNumber,
  initialThreadId,
}: ChatPageProps) {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [resolutions, setResolutions] = useState<Resolution[]>([]);
  const [resolutionSearch, setResolutionSearch] = useState("");
  const [input, setInput] = useState("");
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadThreads = useCallback(async () => {
    setLoadingThreads(true);
    try {
      const data = await api.listChatThreads();
      setThreads(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load threads");
    } finally {
      setLoadingThreads(false);
    }
  }, []);

  const loadResolutions = useCallback(async (query?: string) => {
    try {
      const data = await api.listResolutions({ q: query || undefined, limit: 50 });
      setResolutions(data.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load resolutions");
    }
  }, []);

  const loadMessages = useCallback(async (threadId: string) => {
    setLoadingMessages(true);
    setError(null);
    try {
      const data = await api.listChatMessages(threadId);
      setMessages(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load messages");
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    void loadThreads();
    void loadResolutions();
  }, [loadThreads, loadResolutions]);

  useEffect(() => {
    if (initialThreadId) {
      setActiveThreadId(initialThreadId);
    }
  }, [initialThreadId]);

  useEffect(() => {
    if (initialOwner && initialRepo && initialNumber && !initialThreadId && threads.length === 0 && !loadingThreads) {
      void (async () => {
        try {
          const thread = await api.createChatThread({
            owner: initialOwner,
            repo: initialRepo,
            number: initialNumber,
          });
          setThreads((prev) => [thread, ...prev]);
          setActiveThreadId(thread.id);
        } catch (err) {
          setError(err instanceof ApiError ? err.message : "Failed to start issue chat");
        }
      })();
    }
  }, [initialOwner, initialRepo, initialNumber, initialThreadId, threads.length, loadingThreads]);

  useEffect(() => {
    if (activeThreadId) {
      void loadMessages(activeThreadId);
    } else {
      setMessages([]);
    }
  }, [activeThreadId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function handleNewChat() {
    setError(null);
    try {
      const thread = await api.createChatThread({});
      setThreads((prev) => [thread, ...prev]);
      setActiveThreadId(thread.id);
      setMessages([]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create chat");
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const content = input.trim();
    if (!content || !activeThreadId || sending) return;

    setSending(true);
    setError(null);
    setInput("");
    try {
      const result = await api.sendChatMessage(activeThreadId, content);
      setMessages((prev) => [...prev, result.message, result.reply]);
      await loadThreads();
      await loadResolutions();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to send message");
      setInput(content);
    } finally {
      setSending(false);
    }
  }

  const activeThread = threads.find((thread) => thread.id === activeThreadId);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-8 lg:flex-row">
      <aside className="w-full shrink-0 space-y-4 lg:w-64">
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium">Chats</h2>
            <button
              type="button"
              onClick={() => void handleNewChat()}
              className="text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
              New
            </button>
          </div>
          {loadingThreads && <p className="text-sm text-zinc-500">Loading…</p>}
          <ul className="space-y-2">
            {threads.map((thread) => (
              <li key={thread.id}>
                <button
                  type="button"
                  onClick={() => setActiveThreadId(thread.id)}
                  className={`w-full rounded-md px-2 py-2 text-left text-sm ${
                    activeThreadId === thread.id
                      ? "bg-zinc-100 dark:bg-zinc-900"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                  }`}
                >
                  <div className="truncate font-medium">
                    {thread.title || "Untitled chat"}
                  </div>
                  {thread.issue_full_name && thread.issue_number && (
                    <div className="truncate text-xs text-zinc-500">
                      {thread.issue_full_name}#{thread.issue_number}
                    </div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="mb-3 font-medium">Saved resolutions</h2>
          <input
            type="search"
            value={resolutionSearch}
            onChange={(e) => setResolutionSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void loadResolutions(resolutionSearch);
            }}
            placeholder="Search resolutions…"
            className="mb-3 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
          <button
            type="button"
            onClick={() => void loadResolutions(resolutionSearch)}
            className="mb-3 text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            Search
          </button>
          <ul className="max-h-64 space-y-3 overflow-y-auto text-sm">
            {resolutions.map((resolution) => (
              <li key={resolution.id} className="rounded-md border border-zinc-200 p-2 dark:border-zinc-800">
                <div className="font-medium">
                  {resolution.full_name}#{resolution.issue_number}
                </div>
                <div className="text-zinc-500">{resolution.summary ?? resolution.issue_title}</div>
              </li>
            ))}
            {resolutions.length === 0 && (
              <li className="text-zinc-500">No resolutions saved yet.</li>
            )}
          </ul>
        </div>
      </aside>

      <section className="flex min-h-[70vh] flex-1 flex-col rounded-lg border border-zinc-200 dark:border-zinc-800">
        <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <h1 className="text-lg font-semibold">Agent chat</h1>
          <p className="text-sm text-zinc-500">
            Search stored repos/issues, analyze problems, and save local resolutions via Ollama.
          </p>
          {activeThread && (
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {activeThread.title || "Untitled chat"}
            </p>
          )}
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {!activeThreadId && (
            <p className="text-sm text-zinc-500">
              Select a chat or start a new one. Ask things like “search numpy issues about dtype”
              or “resolve issue 12345 in numpy/numpy”.
            </p>
          )}
          {loadingMessages && <p className="text-sm text-zinc-500">Loading messages…</p>}
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {sending && (
            <p className="text-sm text-zinc-500">Agent is thinking… (Ollama may take a moment)</p>
          )}
          <div ref={bottomRef} />
        </div>

        {error && (
          <p className="px-4 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="border-t border-zinc-200 p-4 dark:border-zinc-800">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                activeThreadId
                  ? "Ask about repos, issues, or request a resolution…"
                  : "Select or create a chat first"
              }
              disabled={!activeThreadId || sending}
              className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
            <button
              type="submit"
              disabled={!activeThreadId || sending || !input.trim()}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              Send
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

export function ChatPage(props: ChatPageProps) {
  return (
    <ProtectedRoute>
      <ChatPageContent {...props} />
    </ProtectedRoute>
  );
}
