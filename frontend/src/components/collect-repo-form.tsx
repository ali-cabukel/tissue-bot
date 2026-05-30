"use client";

import { useState, type FormEvent } from "react";

import * as api from "@/lib/api";
import { ApiError } from "@/lib/types";

interface CollectRepoFormProps {
  onCollected: () => void;
}

export function CollectRepoForm({ onCollected }: CollectRepoFormProps) {
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const trimmed = fullName.trim();
    const parts = trimmed.split("/");
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      setError("Enter a repository as owner/name (e.g. numpy/numpy)");
      return;
    }

    const [owner, repo] = parts;
    setLoading(true);
    try {
      const result = await api.collectRepo(owner, repo);
      setMessage(result.message);
      setFullName("");
      onCollected();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to collect repository");
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
        Collect repository from GitHub
      </h2>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1 text-sm">
          <span className="mb-1 block text-zinc-600 dark:text-zinc-400">Repository</span>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="owner/repo"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            disabled={loading}
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {loading ? "Collecting…" : "Collect repo"}
        </button>
      </div>
      {message && <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">{message}</p>}
      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </form>
  );
}
