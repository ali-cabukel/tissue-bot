"use client";

import { Loader2, MessageSquare, Sparkles } from "lucide-react";

import { Github } from "@/components/icons/github";
import { Markdown } from "@/components/markdown";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatDateTime } from "@/lib/format";
import type { Issue } from "@/lib/types";

export function IssueDetailSheet({
  issue,
  open,
  onOpenChange,
  onResolve,
  onChat,
  resolving,
}: {
  issue: Issue | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResolve: (issue: Issue) => void;
  onChat: (issue: Issue) => void;
  resolving: boolean;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl lg:max-w-3xl"
      >
        {issue ? (
          <>
            <SheetHeader className="gap-2 border-b border-border px-5 py-4 pr-12">
              <div className="flex items-center gap-2">
                <span className="num text-xs text-muted-foreground">#{issue.number}</span>
                <StatusBadge status={issue.state} />
              </div>
              <SheetTitle className="text-base leading-snug">{issue.title}</SheetTitle>
              <SheetDescription className="num text-xs">
                {issue.author ? `@${issue.author}` : "unknown author"} · opened{" "}
                {formatDateTime(issue.created_at)} · updated {formatDateTime(issue.updated_at)}
              </SheetDescription>
              {issue.labels.length > 0 ? (
                <div className="flex flex-wrap gap-1 pt-1">
                  {issue.labels.map((label) => (
                    <span
                      key={label}
                      className="rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] text-muted-foreground"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              ) : null}
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {issue.body ? (
                <Markdown content={issue.body} />
              ) : (
                <p className="text-sm text-muted-foreground">This issue has no body.</p>
              )}
            </div>

            <SheetFooter className="flex-row justify-end gap-2 border-t border-border px-5 py-3">
              <Button asChild variant="ghost" size="sm">
                <a href={issue.url} target="_blank" rel="noreferrer">
                  <Github className="size-3.5" />
                  View on GitHub
                </a>
              </Button>
              <Button variant="outline" size="sm" onClick={() => onChat(issue)}>
                <MessageSquare className="size-3.5" />
                Open chat
              </Button>
              <Button size="sm" onClick={() => onResolve(issue)} disabled={resolving}>
                {resolving ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Sparkles className="size-3.5" />
                )}
                Resolve with agent
              </Button>
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
