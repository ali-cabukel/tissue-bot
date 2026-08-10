"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, ListFilter, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Github } from "@/components/icons/github";
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
import { formatCount, formatDate } from "@/lib/format";
import type { Repo } from "@/lib/types";

function matches(repo: Repo, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    repo.full_name.toLowerCase().includes(q) ||
    (repo.language ?? "").toLowerCase().includes(q) ||
    repo.topics.some((topic) => topic.toLowerCase().includes(q))
  );
}

function issuesHref(repo: Repo): string {
  return `/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.name)}/issues`;
}

export function ReposTable({
  repos,
  loading,
  refreshing,
  onRefresh,
}: {
  repos: Repo[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const filtered = useMemo(
    () => repos.filter((repo) => matches(repo, query)),
    [repos, query],
  );

  return (
    <section className="rounded-lg border border-border bg-card shadow-subtle">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-medium text-foreground">Stored repositories</h2>
          <span className="num text-xs text-muted-foreground">
            {loading ? "—" : `${formatCount(filtered.length)} of ${formatCount(repos.length)}`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, language, topic"
              className="h-8 w-56 pl-8 text-[13px]"
              aria-label="Search repositories"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={refreshing}
            className="h-8"
          >
            <ListFilter className={refreshing ? "size-3.5 animate-pulse" : "size-3.5"} />
            Refresh
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-11 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <h3 className="text-sm font-medium text-foreground">
            {repos.length === 0 ? "No repositories stored" : "No repositories match your search"}
          </h3>
          <p className="mx-auto mt-1.5 max-w-sm text-xs text-muted-foreground">
            {repos.length === 0
              ? "Collect a repository above, or run the tracked list to populate the store."
              : `Nothing matched “${query}”. Try a different name, language or topic.`}
          </p>
          {repos.length > 0 ? (
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
                <TableHead className="h-9 text-xs">Repository</TableHead>
                <TableHead className="h-9 text-xs">Language</TableHead>
                <TableHead className="h-9 text-right text-xs">Stars</TableHead>
                <TableHead className="h-9 text-right text-xs">Forks</TableHead>
                <TableHead className="h-9 text-right text-xs">Updated</TableHead>
                <TableHead className="h-9 w-24 text-right text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((repo) => (
                <TableRow
                  key={repo.id}
                  tabIndex={0}
                  role="link"
                  onClick={() => router.push(issuesHref(repo))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") router.push(issuesHref(repo));
                  }}
                  className="cursor-pointer"
                >
                  <TableCell className="max-w-[26rem] py-2.5">
                    <span className="block truncate text-[13px] font-medium text-foreground">
                      {repo.full_name}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {repo.description ?? "No description"}
                    </span>
                  </TableCell>
                  <TableCell className="py-2.5 text-xs text-muted-foreground">
                    {repo.language ?? "—"}
                  </TableCell>
                  <TableCell className="num py-2.5 text-right text-[13px] text-foreground">
                    {formatCount(repo.stars)}
                  </TableCell>
                  <TableCell className="num py-2.5 text-right text-[13px] text-foreground">
                    {formatCount(repo.forks)}
                  </TableCell>
                  <TableCell className="num py-2.5 text-right text-xs text-muted-foreground">
                    {formatDate(repo.pushed_at ?? repo.updated_at)}
                  </TableCell>
                  <TableCell className="py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs">
                        <Link
                          href={issuesHref(repo)}
                          onClick={(event) => event.stopPropagation()}
                        >
                          Issues
                        </Link>
                      </Button>
                      <Button asChild variant="ghost" size="icon" className="size-7">
                        <a
                          href={repo.url}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Open ${repo.full_name} on GitHub`}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Github className="size-3.5" />
                          <ExternalLink className="sr-only size-3" />
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
