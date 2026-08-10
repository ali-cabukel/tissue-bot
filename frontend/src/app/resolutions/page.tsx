"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Suspense, useMemo, useState } from "react";

import { PageHeader } from "@/components/page-header";
import { ProtectedRoute } from "@/components/protected-route";
import { ResolutionDetail } from "@/components/resolutions/resolution-detail";
import {
  ResolutionsList,
  type ResolutionStatusFilter,
} from "@/components/resolutions/resolutions-list";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCount } from "@/lib/format";
import { listResolutions } from "@/lib/ui-api";

function ResolutionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idParam = searchParams.get("id");
  const selectedId = idParam !== null && /^\d+$/.test(idParam) ? Number(idParam) : null;

  const [filter, setFilter] = useState<ResolutionStatusFilter>("all");

  const resolutionsQuery = useQuery({
    queryKey: ["resolutions"],
    queryFn: listResolutions,
  });

  const resolutions = useMemo(() => resolutionsQuery.data ?? [], [resolutionsQuery.data]);
  const selected = useMemo(
    () => resolutions.find((r) => r.id === selectedId) ?? null,
    [resolutions, selectedId],
  );

  // Query-param detail rather than a nested route, so the static export does
  // not need a second `_` placeholder segment.
  const select = (id: number | null) => {
    router.replace(id === null ? "/resolutions" : `/resolutions?id=${id}`);
  };

  const [owner, repo] = selected ? selected.full_name.split("/") : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resolutions"
        description="Agent analyses and proposed fixes for the issues in the store."
        meta={
          resolutionsQuery.isLoading
            ? "Loading resolutions…"
            : `${formatCount(resolutions.length)} resolutions generated`
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(320px,420px)_1fr] lg:items-start">
        <div className={selected ? "hidden lg:block" : "block"}>
          <ResolutionsList
            resolutions={resolutions}
            loading={resolutionsQuery.isLoading}
            filter={filter}
            onFilterChange={setFilter}
            selectedId={selected?.id ?? null}
            onSelect={(resolution) => select(resolution.id)}
          />
        </div>

        <div className={selected ? "block" : "hidden lg:block"}>
          {selected ? (
            <div className="space-y-3">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => select(null)}
              >
                <ArrowLeft className="size-3.5" />
                All resolutions
              </Button>
              <ResolutionDetail
                resolution={selected}
                issueHref={owner && repo ? { owner, repo } : null}
              />
            </div>
          ) : resolutionsQuery.isLoading ? (
            <div className="space-y-3 rounded-lg border border-border bg-card p-5 shadow-subtle">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : selectedId !== null ? (
            <div className="rounded-lg border border-dashed border-border bg-card px-6 py-20 text-center">
              <p className="text-sm font-medium text-foreground">Resolution not found</p>
              <p className="mt-1 text-xs text-muted-foreground">
                No resolution with id {selectedId} exists in the store.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-card px-6 py-20 text-center">
              <p className="text-sm font-medium text-foreground">Select a resolution</p>
              <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
                Pick a record from the list to read its summary, the agent&apos;s analysis and
                the proposed fix.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResolutionsPage() {
  return (
    <ProtectedRoute>
      <Suspense
        fallback={<div className="py-24 text-center text-sm text-muted-foreground">Loading…</div>}
      >
        <ResolutionsContent />
      </Suspense>
    </ProtectedRoute>
  );
}
