"use client";

import Link from "next/link";

import type { Repo } from "@/lib/types";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

export function ReposTable({
  repos,
  emptyMessage = "No repositories yet. Collect one using the form above.",
}: {
  repos: Repo[];
  emptyMessage?: string;
}) {
  if (repos.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-zinc-500 dark:border-zinc-700">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
        <thead className="bg-zinc-50 dark:bg-zinc-900/50">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Repository</th>
            <th className="px-4 py-3 text-left font-medium">Language</th>
            <th className="px-4 py-3 text-right font-medium">Stars</th>
            <th className="px-4 py-3 text-right font-medium">Forks</th>
            <th className="px-4 py-3 text-left font-medium">Updated</th>
            <th className="px-4 py-3 text-left font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {repos.map((repo) => (
            <tr key={repo.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/30">
              <td className="px-4 py-3">
                <div className="font-medium">{repo.full_name}</div>
                <div className="max-w-md truncate text-zinc-500">{repo.description ?? "—"}</div>
              </td>
              <td className="px-4 py-3">{repo.language ?? "—"}</td>
              <td className="px-4 py-3 text-right tabular-nums">{repo.stars.toLocaleString()}</td>
              <td className="px-4 py-3 text-right tabular-nums">{repo.forks.toLocaleString()}</td>
              <td className="px-4 py-3 whitespace-nowrap">{formatDate(repo.updated_at)}</td>
              <td className="px-4 py-3 whitespace-nowrap">
                <Link
                  href={`/repos/${repo.owner}/${repo.name}/issues`}
                  className="text-blue-600 hover:underline dark:text-blue-400"
                >
                  Issues
                </Link>
                <span className="mx-2 text-zinc-300 dark:text-zinc-700">|</span>
                <a
                  href={repo.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-zinc-600 hover:underline dark:text-zinc-400"
                >
                  GitHub
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
