"use client";

import { useQuery } from "@tanstack/react-query";
import { CircleDot, GitBranch, Layers, Sparkles } from "lucide-react";

import { ActivityTimeline } from "@/components/dashboard/activity-timeline";
import { DashboardEmptyState } from "@/components/dashboard/empty-state";
import { IssuesByRepoChart } from "@/components/dashboard/issues-by-repo-chart";
import { PanelCard } from "@/components/dashboard/panel-card";
import { ResolutionsOverTimeChart } from "@/components/dashboard/resolutions-over-time-chart";
import { StatTile } from "@/components/dashboard/stat-tile";
import { PageHeader } from "@/components/page-header";
import { ProtectedRoute } from "@/components/protected-route";
import { ResultBanner } from "@/components/result-banner";
import { Skeleton } from "@/components/ui/skeleton";
import { getDashboardData } from "@/lib/ui-api";

function DashboardContent() {
  const dashboard = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboardData(),
  });

  const data = dashboard.data;
  const stats = data?.stats;
  const loading = dashboard.isLoading;
  const isEmpty =
    !loading && (stats?.issues_stored ?? 0) === 0 && (stats?.repos_collected ?? 0) === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Collection and resolution activity across all tracked repositories."
      />

      {dashboard.isError ? (
        <ResultBanner
          ok={false}
          message="Could not load the dashboard. Check that the tissue-api service is running."
        />
      ) : null}

      {data?.partial ? (
        <ResultBanner
          ok={false}
          message="Some repositories could not be read, so these totals are incomplete."
        />
      ) : null}

      {isEmpty ? (
        <DashboardEmptyState />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Repositories"
              value={stats?.repos_collected ?? 0}
              detail={`${stats?.repos_tracked ?? 0} tracked · ${stats?.repos_last_7_days ?? 0} collected this week`}
              icon={<GitBranch className="size-4" />}
              loading={loading}
            />
            <StatTile
              label="Issues stored"
              value={stats?.issues_stored ?? 0}
              detail={`${stats?.issues_last_7_days ?? 0} added in the last 7 days`}
              icon={<Layers className="size-4" />}
              loading={loading}
            />
            <StatTile
              label="Open issues"
              value={stats?.issues_open ?? 0}
              detail={`${stats?.issues_closed ?? 0} closed in the store`}
              icon={<CircleDot className="size-4" />}
              loading={loading}
            />
            <StatTile
              label="Resolutions"
              value={stats?.resolutions_generated ?? 0}
              detail={`${stats?.resolutions_proposed ?? 0} with a proposed fix`}
              icon={<Sparkles className="size-4" />}
              loading={loading}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <PanelCard
              title="Issues per repository"
              description="Top repositories by stored issue volume, split by state."
            >
              {data ? (
                <IssuesByRepoChart data={data.issuesByRepo} />
              ) : (
                <Skeleton className="h-[300px] w-full" />
              )}
            </PanelCard>

            <PanelCard
              title="Resolutions over time"
              description="Agent output per day, broken down by resolution status."
            >
              {data ? (
                <ResolutionsOverTimeChart data={data.resolutionsOverTime} />
              ) : (
                <Skeleton className="h-[300px] w-full" />
              )}
            </PanelCard>
          </div>

          <PanelCard
            title="Recent activity"
            description="Latest collected repositories, stored issues and generated resolutions."
          >
            {data ? (
              <ActivityTimeline items={data.activity} />
            ) : (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-10 w-full" />
                ))}
              </div>
            )}
          </PanelCard>
        </>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
