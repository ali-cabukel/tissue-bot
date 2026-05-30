"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CollectIssuesForm } from "@/components/collect-issues-form";
import { IssuesTable } from "@/components/issues-table";
import { ProtectedRoute } from "@/components/protected-route";
import { SearchInput } from "@/components/search-input";
import * as api from "@/lib/api";
import { parseIssuesPagePath } from "@/lib/repo-path";
import { filterIssues } from "@/lib/search";
import type { Issue, Repo } from "@/lib/types";
import { ApiError } from "@/lib/types";

export function IssuesPageClient() {
  const pathname = usePathname();
  const params = useParams<{ owner: string; repo: string }>();
  const fromPath = parseIssuesPagePath(pathname);
  const owner = fromPath?.owner ?? params.owner;
  const repo = fromPath?.repo ?? params.repo;
  const fullName = `${owner}/${repo}`;

  const [repoData, setRepoData] = useState<Repo | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [stateFilter, setStateFilter] = useState<"open" | "closed" | "">("open");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filteredIssues = useMemo(() => filterIssues(issues, search), [issues, search]);

  const loadData = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [repoResult, issuesResult] = await Promise.all([
        api.getRepo(owner, repo),
        api.listIssues(owner, repo, {
          state: stateFilter || undefined,
          limit: 200,
        }),
      ]);
      setRepoData(repoResult);
      setIssues(issuesResult.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load issues");
      setRepoData(null);
      setIssues([]);
    } finally {
      setLoading(false);
    }
  }, [owner, repo, stateFilter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return (
    <ProtectedRoute>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <div className="mb-8">
          <Link
            href="/repos"
            className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            ← Back to repositories
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{fullName} issues</h1>
          {repoData && (
            <p className="mt-1 text-sm text-zinc-500">
              {repoData.stars.toLocaleString()} stars · {repoData.language ?? "Unknown language"}
            </p>
          )}
        </div>

        <CollectIssuesForm owner={owner} repo={repo} onCollected={loadData} />

        <div className="mt-8">
          <div className="mb-4 flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-medium">Stored issues</h2>
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-sm text-zinc-600 dark:text-zinc-400">
                  State
                  <select
                    value={stateFilter}
                    onChange={(e) =>
                      setStateFilter(e.target.value as "open" | "closed" | "")
                    }
                    className="ml-2 rounded-md border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-950"
                  >
                    <option value="">All</option>
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => void loadData()}
                  className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400"
                >
                  Refresh
                </button>
              </div>
            </div>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search title, author, labels, #number…"
              resultCount={filteredIssues.length}
              totalCount={issues.length}
            />
          </div>

          {loading && <p className="text-sm text-zinc-500">Loading issues…</p>}
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          {!loading && !error && (
            <IssuesTable
              issues={filteredIssues}
              owner={owner}
              repo={repo}
              emptyMessage={
                issues.length === 0
                  ? stateFilter === "open"
                    ? "No open issues stored. Collect issues or switch to All / Closed."
                    : stateFilter === "closed"
                      ? "No closed issues stored. Collect issues or switch to All / Open."
                      : undefined
                  : "No issues match your search."
              }
            />
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}
