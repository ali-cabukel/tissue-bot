"use client";

import { MessageSquarePlus, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { dayBucket, formatRelative } from "@/lib/format";
import type { ChatThread } from "@/lib/types";
import { cn } from "@/lib/utils";

const groups = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "earlier", label: "Earlier" },
] as const;

export function ThreadSidebar({
  threads,
  loading,
  activeId,
  onSelect,
  onNewChat,
  collapsed,
  onToggleCollapsed,
  creating,
}: {
  threads: ChatThread[];
  loading: boolean;
  activeId: string | null;
  onSelect: (thread: ChatThread) => void;
  onNewChat: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  creating: boolean;
}) {
  return (
    <aside className="flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-subtle">
      <header className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <Button
          size="sm"
          className="h-8 flex-1 justify-start"
          onClick={onNewChat}
          disabled={creating}
        >
          <MessageSquarePlus className="size-3.5" />
          New chat
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 lg:hidden"
          aria-label={collapsed ? "Show threads" : "Hide threads"}
          onClick={onToggleCollapsed}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
        </Button>
      </header>

      <div className={cn("min-h-0 flex-1 overflow-y-auto", collapsed && "hidden lg:block")}>
        {loading ? (
          <div className="space-y-3 p-3">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-9 w-full" />
            ))}
          </div>
        ) : threads.length === 0 ? (
          <p className="px-3 py-8 text-center text-xs text-muted-foreground">
            No threads yet. Start a new chat to ask the agent about a repository or issue.
          </p>
        ) : (
          groups.map((group) => {
            const items = threads.filter((thread) => dayBucket(thread.updated_at) === group.key);
            if (items.length === 0) return null;
            return (
              <div key={group.key} className="py-2">
                <p className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </p>
                {items.map((thread) => {
                  const active = thread.id === activeId;
                  return (
                    <button
                      key={thread.id}
                      type="button"
                      onClick={() => onSelect(thread)}
                      aria-current={active ? "true" : undefined}
                      className={cn(
                        "block w-full cursor-pointer px-3 py-2 text-left transition-colors",
                        active
                          ? "border-l-2 border-primary bg-accent pl-[10px]"
                          : "border-l-2 border-transparent pl-[10px] hover:bg-accent/50",
                      )}
                    >
                      <p className="truncate text-[13px] leading-snug text-foreground">
                        {thread.title ?? "Untitled chat"}
                      </p>
                      {thread.issue_full_name ? (
                        <p className="num truncate font-mono text-[11px] text-muted-foreground">
                          {thread.issue_full_name} #{thread.issue_number}
                        </p>
                      ) : (
                        <p className="num text-[11px] text-muted-foreground">
                          {formatRelative(thread.updated_at)}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
