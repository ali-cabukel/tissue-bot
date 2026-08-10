"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Star } from "lucide-react";
import { useState } from "react";

import { PanelCard } from "@/components/dashboard/panel-card";
import { Github } from "@/components/icons/github";
import { CollectIssuesForm } from "@/components/issues/collect-issues-form";
import { IssueDetailSheet } from "@/components/issues/issue-detail-sheet";
import { IssuesTable, type IssueStateFilter } from "@/components/issues/issues-table";
import { ProtectedRoute } from "@/components/protected-route";
import { ResultBanner } from "@/components/result-banner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCount } from "@/lib/format";
import { parseIssuesPagePath } from "@/lib/repo-path";
import type { Issue } from "@/lib/types";
import { getRepo, listIssues, resolveIssue, type ResolveResult } from "@/lib/ui-api";

function IssuesContent() {
  const pathname = usePathname();
  const params = useParams<{ owner: string; repo: string }>();

  // Under `output: export` the route is prerendered with the `_/_` placeholder
  // from generateStaticParams, so the real owner/repo come from the URL.
  const fromPath = parseIssuesPagePath(pathname);
  const owner = fromPath?.owner ?? params.owner;
  const repo = fromPath?.repo ?? params.repo;

  const queryClient = useQueryClient();
  const router = useRouter();
  const [filter, setFilter] = useState<IssueStateFilter>("all");
  const [selected, setSelected] = useState<Issue | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const repoQuery = useQuery({
    queryKey: ["repo", owner, repo],
    queryFn: () => getRepo(owner, repo),
  });

  const issuesQuery = useQuery({
    queryKey: ["issues", owner, repo, filter],
    queryFn: () => listIssues({ owner, repo, state: filter }),
  });

  const resolve = useMutation<ResolveResult, Error, Issue>({
    mutationFn: (issue) => resolveIssue(owner, repo, issue.number),
    onSuccess: (result) => {
      if (result.ok && result.thread_id) {
        router.push(`/chat?thread=${encodeURIComponent(result.thread_id)}`);
      }
    },
  });

  const openChat = (issue: Issue) => {
    router.push(
      `/chat?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&number=${issue.number}`,
    );
  };

  const stored = repoQuery.data;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <nav className="flex items-center gap-1 text-xs text-muted-foreground">
          <Link href="/repos" className="hover:text-foreground">
            Repositories
          </Link>
          <ChevronRight className="size-3" />
          <span className="font-mono text-foreground">{`${owner}/${repo}`}</span>
        </nav>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-mono text-lg font-semibold text-foreground">{`${owner}/${repo}`}</h1>
            {repoQuery.isLoading ? (
              <Skeleton className="mt-2 h-4 w-64" />
            ) : stored ? (
              <p className="num mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Star className="size-3" />
                  {formatCount(stored.stars)} stars
                </span>
                <span>{formatCount(stored.forks)} forks</span>
                <span>{stored.language ?? "Unknown language"}</span>
                <span>{stored.license ?? "No licence"}</span>
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">
                This repository is not in the store yet.
              </p>
            )}
          </div>
          {stored ? (
            <Button asChild variant="outline" size="sm">
              <a href={stored.url} target="_blank" rel="noreferrer">
                <Github className="size-3.5" />
                GitHub
              </a>
            </Button>
          ) : null}
        </div>
      </div>

      <PanelCard
        title="Collect issues"
        description="Fetch issues from GitHub for this repository into the store."
      >
        <CollectIssuesForm
          owner={owner}
          repo={repo}
          onCollected={() => {
            void queryClient.invalidateQueries({ queryKey: ["issues", owner, repo] });
            void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
          }}
        />
      </PanelCard>

      {resolve.data && !resolve.data.ok ? (
        <ResultBanner ok={false} message={resolve.data.message} />
      ) : null}

      <IssuesTable
        issues={issuesQuery.data ?? []}
        loading={issuesQuery.isLoading}
        refreshing={issuesQuery.isFetching && !issuesQuery.isLoading}
        onRefresh={() => void issuesQuery.refetch()}
        filter={filter}
        onFilterChange={setFilter}
        onOpenIssue={(issue) => {
          setSelected(issue);
          setSheetOpen(true);
        }}
        onResolve={(issue) => resolve.mutate(issue)}
        onChat={openChat}
        resolvingId={resolve.isPending ? (resolve.variables?.id ?? null) : null}
      />

      <IssueDetailSheet
        issue={selected}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onResolve={(issue) => resolve.mutate(issue)}
        onChat={openChat}
        resolving={resolve.isPending && resolve.variables?.id === selected?.id}
      />
    </div>
  );
}

export function IssuesPageClient() {
  return (
    <ProtectedRoute>
      <IssuesContent />
    </ProtectedRoute>
  );
}
