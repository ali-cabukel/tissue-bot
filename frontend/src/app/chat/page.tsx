"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, ExternalLink, PanelLeftOpen } from "lucide-react";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";

import { ChatTurn } from "@/components/chat/chat-turn";
import { Composer } from "@/components/chat/composer";
import { ThreadSidebar } from "@/components/chat/thread-sidebar";
import { PageHeader } from "@/components/page-header";
import { ProtectedRoute } from "@/components/protected-route";
import { ResultBanner } from "@/components/result-banner";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import * as api from "@/lib/api";
import type { ChatThread } from "@/lib/types";
import { getIssue } from "@/lib/ui-api";

const examplePrompts = [
  "search numpy issues about dtype deprecation",
  "which repositories have the most unresolved regressions?",
  "summarise the newest proposed fix",
  "list the open issues you have stored for scipy",
];

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const threadId = searchParams.get("thread");
  const issueOwner = searchParams.get("owner");
  const issueRepo = searchParams.get("repo");
  const issueNumberParam = searchParams.get("number");
  const issueNumber = issueNumberParam && /^\d+$/.test(issueNumberParam)
    ? Number(issueNumberParam)
    : null;

  const [draft, setDraft] = useState("");
  const [collapsed, setCollapsed] = useState(true);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const autoCreated = useRef(false);

  const threadsQuery = useQuery({ queryKey: ["chat-threads"], queryFn: api.listChatThreads });
  const threads = useMemo(() => threadsQuery.data ?? [], [threadsQuery.data]);
  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === threadId) ?? null,
    [threads, threadId],
  );

  const messagesQuery = useQuery({
    queryKey: ["chat-messages", threadId],
    queryFn: () => api.listChatMessages(threadId as string),
    enabled: Boolean(threadId),
  });

  const boundIssueQuery = useQuery({
    queryKey: ["chat-bound-issue", activeThread?.issue_full_name, activeThread?.issue_number],
    queryFn: () => {
      const [owner, repo] = (activeThread?.issue_full_name ?? "").split("/");
      return getIssue(owner!, repo!, activeThread?.issue_number as number);
    },
    enabled: Boolean(activeThread?.issue_full_name && activeThread?.issue_number),
  });

  const openThread = (thread: ChatThread) => {
    setCollapsed(true);
    router.replace(`/chat?thread=${encodeURIComponent(thread.id)}`);
  };

  const newChat = useMutation({
    mutationFn: () => api.createChatThread({}),
    onSuccess: async (thread) => {
      await queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
      openThread(thread);
    },
  });

  const send = useMutation({
    mutationFn: (vars: { threadId: string; content: string }) =>
      api.sendChatMessage(vars.threadId, vars.content),
    onSuccess: async (_data, vars) => {
      await queryClient.invalidateQueries({ queryKey: ["chat-messages", vars.threadId] });
      await queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
    },
  });

  // Arriving from an issue's "Chat" action: open a thread bound to that issue.
  useEffect(() => {
    if (threadId || autoCreated.current) return;
    if (!issueOwner || !issueRepo || issueNumber === null) return;

    autoCreated.current = true;
    void api
      .createChatThread({ owner: issueOwner, repo: issueRepo, number: issueNumber })
      .then(async (thread) => {
        await queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
        router.replace(`/chat?thread=${encodeURIComponent(thread.id)}`);
      })
      .catch(() => {
        autoCreated.current = false;
      });
  }, [threadId, issueOwner, issueRepo, issueNumber, queryClient, router]);

  const messages = messagesQuery.data ?? [];
  const pendingUserMessage = send.isPending ? (send.variables?.content ?? null) : null;

  useEffect(() => {
    transcriptRef.current?.scrollTo({
      top: transcriptRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length, send.isPending]);

  const submit = () => {
    const content = draft.trim();
    if (!content || !threadId) return;
    setDraft("");
    send.mutate({ threadId, content });
  };

  const startWithDraft = () => {
    const content = draft.trim();
    if (!content) return;
    void api.createChatThread({ title: content.slice(0, 60) }).then(async (thread) => {
      await queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
      setDraft("");
      router.replace(`/chat?thread=${encodeURIComponent(thread.id)}`);
      send.mutate({ threadId: thread.id, content });
    });
  };

  const boundIssue = boundIssueQuery.data ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agent chat"
        description="Ask the agent about collected repositories, issues and generated resolutions."
        meta={
          threadsQuery.isLoading
            ? "Loading threads…"
            : `${threads.length} thread${threads.length === 1 ? "" : "s"}`
        }
      />

      {send.isError ? (
        <ResultBanner ok={false} message="The agent could not reply. Try sending again." />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(240px,300px)_1fr] lg:items-start">
        <ThreadSidebar
          threads={threads}
          loading={threadsQuery.isLoading}
          activeId={threadId}
          onSelect={openThread}
          onNewChat={() => newChat.mutate()}
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((value) => !value)}
          creating={newChat.isPending}
        />

        <section className="flex h-[calc(100vh-15rem)] min-h-[520px] flex-col overflow-hidden rounded-lg border border-border bg-card shadow-subtle">
          {activeThread ? (
            <>
              <header className="space-y-2 border-b border-border px-5 py-3">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 lg:hidden"
                    aria-label="Show threads"
                    onClick={() => setCollapsed(false)}
                  >
                    <PanelLeftOpen className="size-4" />
                  </Button>
                  <h2 className="truncate text-sm font-medium text-foreground">
                    {activeThread.title ?? "Untitled chat"}
                  </h2>
                </div>

                {activeThread.issue_full_name ? (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border bg-surface px-3 py-2">
                    <span className="num font-mono text-[11px] text-muted-foreground">
                      {activeThread.issue_full_name} #{activeThread.issue_number}
                    </span>
                    {boundIssue ? (
                      <>
                        <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                          {boundIssue.title}
                        </span>
                        <StatusBadge status={boundIssue.state} />
                      </>
                    ) : null}
                    <Link
                      href={`/repos/${encodeURIComponent(activeThread.issue_full_name.split("/")[0]!)}/${encodeURIComponent(activeThread.issue_full_name.split("/")[1]!)}/issues`}
                      className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                    >
                      View issue
                      <ExternalLink className="size-3" />
                    </Link>
                  </div>
                ) : null}
              </header>

              <div ref={transcriptRef} className="min-h-0 flex-1 overflow-y-auto">
                {messagesQuery.isLoading ? (
                  <div className="space-y-4 p-5">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                ) : messages.length === 0 && !pendingUserMessage ? (
                  <div className="px-6 py-16 text-center">
                    <p className="text-sm font-medium text-foreground">Empty thread</p>
                    <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
                      Send the first message to start the conversation.
                    </p>
                  </div>
                ) : (
                  <>
                    {messages.map((message) => (
                      <ChatTurn key={message.id} message={message} />
                    ))}
                    {pendingUserMessage ? (
                      <>
                        <ChatTurn
                          message={{
                            id: -1,
                            thread_id: activeThread.id,
                            role: "user",
                            content: pendingUserMessage,
                            created_at: new Date().toISOString(),
                          }}
                        />
                        <ChatTurn pending />
                      </>
                    ) : null}
                  </>
                )}
              </div>

              <Composer
                value={draft}
                onChange={setDraft}
                onSubmit={submit}
                busy={send.isPending}
              />
            </>
          ) : (
            <div className="flex flex-1 flex-col">
              <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
                <span className="flex size-9 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary">
                  <Bot className="size-4" />
                </span>
                <h2 className="mt-3 text-sm font-medium text-foreground">
                  What should the agent look at?
                </h2>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                  Start a new chat, or pick one of these to fill the composer.
                </p>
                <div className="mt-4 flex w-full max-w-md flex-col gap-2">
                  {examplePrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => setDraft(prompt)}
                      className="cursor-pointer rounded-md border border-border bg-surface px-3 py-2 text-left text-xs text-foreground transition-colors hover:border-border-strong hover:bg-accent"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>

              <Composer
                value={draft}
                onChange={setDraft}
                onSubmit={startWithDraft}
                busy={newChat.isPending}
                placeholder="Start a new chat…"
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <ProtectedRoute>
      <Suspense
        fallback={<div className="py-24 text-center text-sm text-muted-foreground">Loading…</div>}
      >
        <ChatContent />
      </Suspense>
    </ProtectedRoute>
  );
}
