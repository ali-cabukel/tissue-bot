"use client";

import { useState, type FormEvent } from "react";

import * as api from "@/lib/api";
import { ApiError } from "@/lib/types";

interface CollectIssuesFormProps {
  owner: string;
  repo: string;
  onCollected: () => void;
}

export function CollectIssuesForm({ owner, repo, onCollected }: CollectIssuesFormProps) {
  const [state, setState] = useState<"open" | "closed">("open");
  const [limit, setLimit] = useState(100);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const result = await api.collectIssues(owner, repo, { state, limit });
      setMessage(result.message);
      onCollected();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to collect issues");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40"
    >
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
        Collect issues from GitHub
      </h2>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="text-sm">
          <span className="mb-1 block text-zinc-600 dark:text-zinc-400">State</span>
          <select
            value={state}
            onChange={(e) => setState(e.target.value as "open" | "closed")}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            disabled={loading}
          >
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-zinc-600 dark:text-zinc-400">Limit</span>
          <input
            type="number"
            min={1}
            max={500}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="w-28 rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            disabled={loading}
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {loading ? "Collecting…" : "Collect issues"}
        </button>
      </div>
      {message && <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">{message}</p>}
      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </form>
  );
}
