"use client";

import { Loader2, MessageSquare, RefreshCw, Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import { Github } from "@/components/icons/github";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCount, formatDate } from "@/lib/format";
import type { Issue } from "@/lib/types";

export type IssueStateFilter = "all" | "open" | "closed";

function matches(issue: Issue, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    issue.title.toLowerCase().includes(q) ||
    (issue.author ?? "").toLowerCase().includes(q) ||
    issue.labels.some((label) => label.toLowerCase().includes(q)) ||
    String(issue.number).includes(q.replace("#", ""))
  );
}

export function IssuesTable({
  issues,
  loading,
  refreshing,
  onRefresh,
  filter,
  onFilterChange,
  onOpenIssue,
  onResolve,
  onChat,
  resolvingId,
}: {
  issues: Issue[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  filter: IssueStateFilter;
  onFilterChange: (filter: IssueStateFilter) => void;
  onOpenIssue: (issue: Issue) => void;
  onResolve: (issue: Issue) => void;
  onChat: (issue: Issue) => void;
  resolvingId: number | null;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => issues.filter((issue) => matches(issue, query)), [issues, query]);

  const emptyCopy = query.trim()
    ? {
        title: "No issues match your search",
        detail: `Nothing matched “${query}” in titles, authors, labels or issue numbers.`,
      }
    : filter === "open"
      ? {
          title: "No open issues stored",
          detail: "Collect open issues for this repository, or switch the filter to All.",
        }
      : filter === "closed"
        ? {
            title: "No closed issues stored",
            detail: "Closed issues have not been collected for this repository yet.",
          }
        : {
            title: "No issues stored",
            detail: "Run a collection above to fetch this repository's issues.",
          };

  return (
    <section className="rounded-lg border border-border bg-card shadow-subtle">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Tabs value={filter} onValueChange={(next) => onFilterChange(next as IssueStateFilter)}>
            <TabsList className="h-8">
              <TabsTrigger value="all" className="text-xs">
                All
              </TabsTrigger>
              <TabsTrigger value="open" className="text-xs">
                Open
              </TabsTrigger>
              <TabsTrigger value="closed" className="text-xs">
                Closed
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <span className="num text-xs text-muted-foreground">
            {loading ? "—" : `${formatCount(filtered.length)} issues`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title, author, label, #number"
              className="h-8 w-64 pl-8 text-[13px]"
              aria-label="Search issues"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={refreshing}
            className="h-8"
          >
            <RefreshCw className={refreshing ? "size-3.5 animate-spin" : "size-3.5"} />
            Refresh
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-11 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <h3 className="text-sm font-medium text-foreground">{emptyCopy.title}</h3>
          <p className="mx-auto mt-1.5 max-w-sm text-xs text-muted-foreground">
            {emptyCopy.detail}
          </p>
          {query.trim() ? (
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setQuery("")}>
              Clear search
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-9 w-20 text-right text-xs">Issue</TableHead>
                <TableHead className="h-9 text-xs">Title</TableHead>
                <TableHead className="h-9 w-24 text-xs">State</TableHead>
                <TableHead className="h-9 text-xs">Author</TableHead>
                <TableHead className="h-9 text-right text-xs">Updated</TableHead>
                <TableHead className="h-9 w-40 text-right text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((issue) => (
                <TableRow key={issue.id}>
                  <TableCell className="num py-2.5 text-right text-xs text-muted-foreground">
                    #{issue.number}
                  </TableCell>
                  <TableCell className="max-w-[30rem] py-2.5">
                    <button
                      type="button"
                      onClick={() => onOpenIssue(issue)}
                      className="block max-w-full cursor-pointer truncate text-left text-[13px] font-medium text-foreground hover:text-primary hover:underline"
                    >
                      {issue.title}
                    </button>
                    {issue.labels.length > 0 ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {issue.labels.slice(0, 4).map((label) => (
                          <span
                            key={label}
                            className="rounded-full border border-border bg-surface px-1.5 py-px text-[10px] text-muted-foreground"
                          >
                            {label}
                          </span>
                        ))}
                        {issue.labels.length > 4 ? (
                          <span className="num text-[10px] text-muted-foreground">
                            +{issue.labels.length - 4}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell className="py-2.5">
                    <StatusBadge status={issue.state} />
                  </TableCell>
                  <TableCell className="py-2.5 text-xs text-muted-foreground">
                    {issue.author ? `@${issue.author}` : "—"}
                  </TableCell>
                  <TableCell className="num py-2.5 text-right text-xs text-muted-foreground">
                    {formatDate(issue.updated_at)}
                  </TableCell>
                  <TableCell className="py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        onClick={() => onResolve(issue)}
                        disabled={resolvingId === issue.id}
                      >
                        {resolvingId === issue.id ? (
                          <>
                            <Loader2 className="size-3 animate-spin" />
                            Resolving
                          </>
                        ) : (
                          <>
                            <Sparkles className="size-3" />
                            Resolve
                          </>
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        aria-label={`Chat about issue #${issue.number}`}
                        onClick={() => onChat(issue)}
                      >
                        <MessageSquare className="size-3.5" />
                      </Button>
                      <Button asChild size="icon" variant="ghost" className="size-7">
                        <a
                          href={issue.url}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Open issue #${issue.number} on GitHub`}
                        >
                          <Github className="size-3.5" />
                        </a>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
