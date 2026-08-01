"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { CollectRepoForm } from "@/components/collect-repo-form";
import { ProtectedRoute } from "@/components/protected-route";
import { ReposTable } from "@/components/repos-table";
import { SearchInput } from "@/components/search-input";
import { TrackedReposPanel } from "@/components/tracked-repos-panel";
import * as api from "@/lib/api";
import { filterRepos } from "@/lib/search";
import type { Repo } from "@/lib/types";
import { ApiError } from "@/lib/types";

export default function ReposPage() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filteredRepos = useMemo(() => filterRepos(repos, search), [repos, search]);

  const loadRepos = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await api.listRepos(200, 0);
      setRepos(data.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load repositories");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRepos();
  }, [loadRepos]);

  return (
    <ProtectedRoute>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Repositories</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Collect repositories from GitHub and browse stored data.
          </p>
        </div>

        <CollectRepoForm onCollected={loadRepos} />

        <div className="mt-6">
          <TrackedReposPanel onCollected={loadRepos} />
        </div>

        <div className="mt-8">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-medium">Stored repositories</h2>
            <div className="flex items-center gap-3">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search name, language, topics…"
                resultCount={filteredRepos.length}
                totalCount={repos.length}
              />
              <button
                type="button"
                onClick={() => void loadRepos()}
                className="shrink-0 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                Refresh
              </button>
            </div>
          </div>

          {loading && <p className="text-sm text-zinc-500">Loading repositories…</p>}
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          {!loading && !error && (
            <ReposTable
              repos={filteredRepos}
              emptyMessage={
                repos.length === 0
                  ? undefined
                  : "No repositories match your search."
              }
            />
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}
