"use client";

import { Bot, User } from "lucide-react";

import { Markdown } from "@/components/markdown";
import { formatRelative } from "@/lib/format";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * A single turn. The body is deliberately a plain container so that partial
 * content could be appended later without changing the layout — today the api
 * returns the complete reply in one response.
 */
export function ChatTurn({
  message,
  pending,
}: {
  message?: ChatMessage;
  pending?: boolean;
}) {
  const role = pending ? "assistant" : (message?.role ?? "assistant");
  const isUser = role === "user";

  return (
    <div className="flex gap-3 border-b border-border px-5 py-5 last:border-b-0">
      <span
        aria-hidden
        className={cn(
          "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border",
          isUser
            ? "border-border bg-surface text-muted-foreground"
            : "border-primary/30 bg-primary/10 text-primary",
        )}
      >
        {isUser ? <User className="size-3" /> : <Bot className="size-3" />}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p
            className={cn(
              "text-[11px] font-medium uppercase tracking-wide",
              isUser ? "text-muted-foreground" : "text-primary",
            )}
          >
            {isUser ? "You" : "Agent"}
          </p>
          {message ? (
            <span className="num text-[11px] text-muted-foreground">
              {formatRelative(message.created_at)}
            </span>
          ) : null}
        </div>

        <div className="mt-2 min-h-5">
          {pending ? (
            <ThinkingIndicator />
          ) : isUser ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {message?.content}
            </p>
          ) : (
            <Markdown content={message?.content ?? ""} />
          )}
        </div>
      </div>
    </div>
  );
}

export function ThinkingIndicator() {
  return (
    <p className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
      <span className="flex gap-1" aria-hidden>
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="size-1.5 animate-pulse rounded-full bg-primary"
            style={{ animationDelay: `${index * 160}ms`, animationDuration: "1s" }}
          />
        ))}
      </span>
      Agent is working…
    </p>
  );
}
