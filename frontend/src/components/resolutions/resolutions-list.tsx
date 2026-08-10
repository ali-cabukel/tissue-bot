"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { StatusBadge } from "@/components/status-badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCount, formatRelative } from "@/lib/format";
import type { Resolution } from "@/lib/types";
import { cn } from "@/lib/utils";

export type ResolutionStatusFilter =
  | "all"
  | "pending"
  | "analysing"
  | "proposed"
  | "failed";

const filters: { value: ResolutionStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "analysing", label: "Analysing" },
  { value: "proposed", label: "Proposed" },
  { value: "failed", label: "Failed" },
];

function matches(resolution: Resolution, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    resolution.issue_title.toLowerCase().includes(q) ||
    resolution.full_name.toLowerCase().includes(q) ||
    (resolution.summary ?? "").toLowerCase().includes(q) ||
    String(resolution.issue_number).includes(q.replace("#", ""))
  );
}

export function ResolutionsList({
  resolutions,
  loading,
  filter,
  onFilterChange,
  selectedId,
  onSelect,
}: {
  resolutions: Resolution[];
  loading: boolean;
  filter: ResolutionStatusFilter;
  onFilterChange: (filter: ResolutionStatusFilter) => void;
  selectedId: number | null;
  onSelect: (resolution: Resolution) => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () =>
      resolutions
        .filter((r) => filter === "all" || r.status === filter)
        .filter((r) => matches(r, query)),
    [resolutions, filter, query],
  );

  return (
    <section className="flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-subtle">
      <header className="space-y-3 border-b border-border px-4 py-3">
        <Tabs
          value={filter}
          onValueChange={(value) => onFilterChange(value as ResolutionStatusFilter)}
        >
          <TabsList className="h-8 w-full justify-start">
            {filters.map((item) => (
              <TabsTrigger key={item.value} value={item.value} className="text-xs">
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search issue, repository or summary"
              className="h-8 pl-8 text-xs"
              aria-label="Search resolutions"
            />
          </div>
          <p className="num shrink-0 text-xs text-muted-foreground" aria-live="polite">
            {loading
              ? "Loading…"
              : `${formatCount(filtered.length)} result${filtered.length === 1 ? "" : "s"}`}
          </p>
        </div>
      </header>

      <div className="divide-y divide-border">
        {loading ? (
          Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="space-y-2 px-4 py-3">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="px-4 py-14 text-center">
            <p className="text-sm font-medium text-foreground">No resolutions match</p>
            <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
              {query.trim()
                ? `Nothing matched “${query}” in issue titles, repositories or summaries.`
                : "Run the agent from an issue to generate a resolution with this status."}
            </p>
          </div>
        ) : (
          filtered.map((resolution) => {
            const active = resolution.id === selectedId;
            return (
              <button
                key={resolution.id}
                type="button"
                onClick={() => onSelect(resolution)}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "block w-full cursor-pointer px-4 py-3 text-left transition-colors",
                  active ? "bg-accent" : "hover:bg-accent/50",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="line-clamp-2 text-[13px] font-medium leading-snug text-foreground">
                    {resolution.issue_title}
                  </p>
                  <StatusBadge status={resolution.status} className="mt-0.5 shrink-0" />
                </div>
                <p className="num mt-1 font-mono text-[11px] text-muted-foreground">
                  {resolution.full_name} #{resolution.issue_number}
                </p>
                <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {resolution.summary ?? "No summary generated yet."}
                </p>
                <p className="num mt-1.5 text-[11px] text-muted-foreground">
                  Updated {formatRelative(resolution.updated_at)}
                </p>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
