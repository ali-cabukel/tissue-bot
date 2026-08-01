"use client";

import { useCallback, useEffect, useState } from "react";

import * as api from "@/lib/api";
import { ApiError, type TrackedRepo } from "@/lib/types";

interface TrackedReposPanelProps {
  onCollected: () => void;
}

export function TrackedReposPanel({ onCollected }: TrackedReposPanelProps) {
  const [items, setItems] = useState<TrackedRepo[]>([]);
  const [sourceFile, setSourceFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [collecting, setCollecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadTracked = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await api.listTrackedRepos();
      setItems(data.items);
      setSourceFile(data.source_file);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load tracked repositories");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTracked();
  }, [loadTracked]);

  async function handleCollectAll() {
    setError(null);
    setMessage(null);
    setCollecting(true);
    try {
      const result = await api.collectTrackedRepos({ issueLimit: 50 });
      setMessage(result.message);
      await loadTracked();
      onCollected();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to collect tracked repositories");
    } finally {
      setCollecting(false);
    }
  }

  const collectedCount = items.filter((item) => item.collected).length;

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Scientific libraries
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Default tracked repos from{" "}
            <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs dark:bg-zinc-900">
              {sourceFile ? sourceFile.split("/").slice(-2).join("/") : "scientific-repos.txt"}
            </code>
            . Collect them to populate the table below.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleCollectAll()}
          disabled={collecting || loading || items.length === 0}
          className="shrink-0 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {collecting ? "Collecting…" : "Collect all"}
        </button>
      </div>

      {loading && <p className="mt-4 text-sm text-zinc-500">Loading tracked repositories…</p>}
      {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {message && (
        <p className="mt-4 text-sm text-emerald-600 dark:text-emerald-400">{message}</p>
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <p className="mt-4 text-sm text-zinc-500">
            {collectedCount} of {items.length} collected
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <li
                key={item.full_name}
                className="flex items-center justify-between rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
              >
                <span className="font-medium">{item.full_name}</span>
                <span
                  className={
                    item.collected
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-zinc-400"
                  }
                >
                  {item.collected ? "Collected" : "Pending"}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
