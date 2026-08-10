"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { PanelCard } from "@/components/dashboard/panel-card";
import { PageHeader } from "@/components/page-header";
import { ProtectedRoute } from "@/components/protected-route";
import { CollectRepoForm } from "@/components/repos/collect-repo-form";
import { ReposTable } from "@/components/repos/repos-table";
import { TrackedReposPanel } from "@/components/repos/tracked-repos-panel";
import { formatCount } from "@/lib/format";
import { listRepos, listTrackedRepos } from "@/lib/ui-api";

function ReposContent() {
  const queryClient = useQueryClient();
  const repos = useQuery({ queryKey: ["repos"], queryFn: listRepos });
  const tracked = useQuery({ queryKey: ["tracked-repos"], queryFn: listTrackedRepos });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["repos"] });
    void queryClient.invalidateQueries({ queryKey: ["tracked-repos"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Repositories"
        description="Collect GitHub repositories into the store, then drill into their issues."
        meta={
          repos.isLoading
            ? "Loading store…"
            : `${formatCount(repos.data?.length ?? 0)} repositories stored`
        }
      />

      <PanelCard
        title="Collect a repository"
        description="Paste owner/name or a GitHub URL to fetch metadata and issues."
      >
        <CollectRepoForm onCollected={invalidate} />
      </PanelCard>

      <TrackedReposPanel
        tracked={tracked.data ?? []}
        loading={tracked.isLoading}
        onCollected={invalidate}
      />

      <ReposTable
        repos={repos.data ?? []}
        loading={repos.isLoading}
        refreshing={repos.isFetching && !repos.isLoading}
        onRefresh={() => void queryClient.invalidateQueries({ queryKey: ["repos"] })}
      />
    </div>
  );
}

export default function ReposPage() {
  return (
    <ProtectedRoute>
      <ReposContent />
    </ProtectedRoute>
  );
}
