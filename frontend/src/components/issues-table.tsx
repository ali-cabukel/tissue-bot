"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Modal } from "@/components/modal";
import { githubProfileUrl } from "@/lib/github";
import * as api from "@/lib/api";
import type { Issue } from "@/lib/types";
import { ApiError } from "@/lib/types";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function AuthorLink({ author }: { author: string | null }) {
  if (!author) return <>—</>;

  return (
    <a
      href={githubProfileUrl(author)}
      target="_blank"
      rel="noreferrer"
      className="text-blue-600 hover:underline dark:text-blue-400"
    >
      @{author}
    </a>
  );
}

function StateBadge({ state }: { state: string }) {
  const isOpen = state.toLowerCase() === "open";
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
        isOpen
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
          : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
      }`}
    >
      {state}
    </span>
  );
}

function IssueBodyModal({
  issue,
  onClose,
}: {
  issue: Issue | null;
  onClose: () => void;
}) {
  return (
    <Modal open={issue !== null} onClose={onClose} title={issue ? `Issue #${issue.number}` : ""}>
      {issue && (
        <div className="space-y-4 text-sm">
          <h3 className="text-base font-semibold leading-snug text-zinc-900 dark:text-zinc-100">
            {issue.title}
          </h3>

          <div className="flex flex-wrap items-center gap-2 text-zinc-500">
            <StateBadge state={issue.state} />
            {issue.author && (
              <span>
                by <AuthorLink author={issue.author} />
              </span>
            )}
            <span>·</span>
            <span>Updated {formatDate(issue.updated_at)}</span>
          </div>

          {issue.labels.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {issue.labels.map((label) => (
                <span
                  key={label}
                  className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-800"
                >
                  {label}
                </span>
              ))}
            </div>
          )}

          <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
            {issue.body ? (
              <pre className="whitespace-pre-wrap font-sans text-zinc-800 dark:text-zinc-200">
                {issue.body}
              </pre>
            ) : (
              <p className="text-zinc-500 italic">No description provided.</p>
            )}
          </div>

          <a
            href={issue.url}
            target="_blank"
            rel="noreferrer"
            className="inline-block text-blue-600 hover:underline dark:text-blue-400"
          >
            Open on GitHub →
          </a>
        </div>
      )}
    </Modal>
  );
}

export function IssuesTable({
  issues,
  owner,
  repo,
  emptyMessage = "No issues yet. Collect issues using the form above.",
}: {
  issues: Issue[];
  owner?: string;
  repo?: string;
  emptyMessage?: string;
}) {
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const router = useRouter();

  async function handleResolve(issue: Issue) {
    if (!owner || !repo) return;
    setResolveError(null);
    setResolvingId(issue.number);
    try {
      const result = await api.resolveIssue(owner, repo, issue.number);
      router.push(`/chat?thread=${result.thread_id}`);
    } catch (err) {
      setResolveError(err instanceof ApiError ? err.message : "Resolution failed");
    } finally {
      setResolvingId(null);
    }
  }

  if (issues.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-zinc-500 dark:border-zinc-700">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      {resolveError && (
        <p className="mb-3 text-sm text-red-600 dark:text-red-400">{resolveError}</p>
      )}
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full table-fixed divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
          <thead className="bg-zinc-50 dark:bg-zinc-900/50">
            <tr>
              <th className="w-14 px-3 py-3 text-left font-medium">#</th>
              <th className="px-3 py-3 text-left font-medium">Title</th>
              <th className="w-20 px-3 py-3 text-left font-medium">State</th>
              <th className="hidden w-28 px-3 py-3 text-left font-medium sm:table-cell">Updated</th>
              <th className="w-36 px-3 py-3 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {issues.map((issue) => (
              <tr key={issue.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/30">
                <td className="px-3 py-3 tabular-nums text-zinc-500">{issue.number}</td>
                <td className="px-3 py-3">
                  <button
                    type="button"
                    onClick={() => setSelectedIssue(issue)}
                    className="block w-full truncate text-left font-medium hover:text-blue-600 hover:underline dark:hover:text-blue-400"
                    title={issue.title}
                  >
                    {issue.title}
                  </button>
                  <p className="mt-0.5 truncate text-xs text-zinc-500 sm:hidden">
                    {issue.author ? `@${issue.author}` : "—"} · {formatDate(issue.updated_at)}
                  </p>
                </td>
                <td className="px-3 py-3">
                  <StateBadge state={issue.state} />
                </td>
                <td className="hidden px-3 py-3 whitespace-nowrap text-zinc-500 sm:table-cell">
                  {formatDate(issue.updated_at)}
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-col gap-1 text-xs">
                    {owner && repo && (
                      <>
                        <button
                          type="button"
                          onClick={() => void handleResolve(issue)}
                          disabled={resolvingId === issue.number}
                          className="text-left text-emerald-600 hover:underline disabled:opacity-50 dark:text-emerald-400"
                        >
                          {resolvingId === issue.number ? "Resolving…" : "Resolve"}
                        </button>
                        <Link
                          href={`/chat?owner=${owner}&repo=${repo}&number=${issue.number}`}
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          Chat
                        </Link>
                      </>
                    )}
                    <a
                      href={issue.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-zinc-600 hover:underline dark:text-zinc-400"
                    >
                      GitHub
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <IssueBodyModal issue={selectedIssue} onClose={() => setSelectedIssue(null)} />
    </>
  );
}
