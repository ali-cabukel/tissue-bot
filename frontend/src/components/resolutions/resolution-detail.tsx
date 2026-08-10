"use client";

import Link from "next/link";
import { ExternalLink, FileText, MessageSquare } from "lucide-react";

import { Github } from "@/components/icons/github";
import { Markdown } from "@/components/markdown";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import type { Resolution } from "@/lib/types";

function Section({
  title,
  content,
  emptyLabel,
}: {
  title: string;
  content: string | null;
  emptyLabel: string;
}) {
  return (
    <section className="border-t border-border px-5 py-4 first:border-t-0">
      <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <div className="mt-3">
        {content ? (
          <Markdown content={content} />
        ) : (
          <div className="rounded-md border border-dashed border-border bg-surface px-4 py-6 text-center">
            <p className="text-xs font-medium text-foreground">Not generated</p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
              {emptyLabel}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

export function ResolutionDetail({
  resolution,
  issueHref,
}: {
  resolution: Resolution;
  issueHref: { owner: string; repo: string } | null;
}) {
  const githubUrl = `https://github.com/${resolution.full_name}/issues/${resolution.issue_number}`;

  return (
    <article className="overflow-hidden rounded-lg border border-border bg-card shadow-subtle">
      <header className="space-y-3 border-b border-border px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-medium leading-snug text-foreground">
              {resolution.issue_title}
            </h2>
            <p className="num mt-1 font-mono text-xs text-muted-foreground">
              {resolution.full_name} #{resolution.issue_number}
            </p>
          </div>
          <StatusBadge status={resolution.status} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {issueHref ? (
            <Button asChild variant="outline" size="sm">
              <Link
                href={`/repos/${encodeURIComponent(issueHref.owner)}/${encodeURIComponent(issueHref.repo)}/issues`}
              >
                <FileText className="size-3.5" />
                Originating issue
              </Link>
            </Button>
          ) : null}
          <Button asChild variant="outline" size="sm">
            <a href={githubUrl} target="_blank" rel="noreferrer">
              <Github className="size-3.5" />
              GitHub
              <ExternalLink className="size-3" />
            </a>
          </Button>
          {resolution.thread_id ? (
            <Button asChild size="sm">
              <Link href={`/chat?thread=${encodeURIComponent(resolution.thread_id)}`}>
                <MessageSquare className="size-3.5" />
                Continue in chat
              </Link>
            </Button>
          ) : (
            <Button size="sm" disabled title="No chat thread was created for this resolution">
              <MessageSquare className="size-3.5" />
              Continue in chat
            </Button>
          )}
        </div>

        <p className="num text-[11px] text-muted-foreground">
          Created {formatDateTime(resolution.created_at)} · updated{" "}
          {formatDateTime(resolution.updated_at)}
        </p>
      </header>

      <Section
        title="Summary"
        content={resolution.summary}
        emptyLabel="The agent has not written a summary for this issue yet."
      />
      <Section
        title="Analysis"
        content={resolution.analysis}
        emptyLabel="Analysis appears once the agent has read the issue and traced the failing path."
      />
      <Section
        title="Proposed fix"
        content={resolution.proposed_fix}
        emptyLabel="A proposed fix is written only after the analysis reaches a confident root cause."
      />
    </article>
  );
}
