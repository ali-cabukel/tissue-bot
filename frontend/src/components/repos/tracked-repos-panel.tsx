"use client";

import { useMutation } from "@tanstack/react-query";
import { Check, ChevronDown, CircleDashed, Loader2, Play } from "lucide-react";
import { useState } from "react";

import { ResultBanner } from "@/components/result-banner";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { TrackedRepo } from "@/lib/types";
import { collectAllTracked, type ActionResult, type IssueState } from "@/lib/ui-api";
import { cn } from "@/lib/utils";

export function TrackedReposPanel({
  tracked,
  loading,
  onCollected,
}: {
  tracked: TrackedRepo[];
  loading: boolean;
  onCollected?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [limit, setLimit] = useState("50");
  const [state, setState] = useState<IssueState>("open");

  const mutation = useMutation<ActionResult, Error, void>({
    mutationFn: () => collectAllTracked({ limit: Number(limit) || 50, state }),
    onSuccess: (result) => {
      if (result.ok) onCollected?.();
    },
  });

  const collected = tracked.filter((entry) => entry.collected).length;

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-lg border border-border bg-card shadow-subtle"
    >
      <CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between gap-4 px-4 py-3 text-left">
        <div>
          <h2 className="text-sm font-medium text-foreground">Tracked repositories</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Curated scientific Python libraries from the tracking config file.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="num text-xs text-muted-foreground">
            {loading ? "—" : `${collected} of ${tracked.length} collected`}
          </span>
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="space-y-4 border-t border-border p-4">
          {loading ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-9 w-full" />
              ))}
            </div>
          ) : tracked.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              No tracked repositories are configured.
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {tracked.map((entry) => (
                <li
                  key={entry.full_name}
                  className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface px-2.5 py-2"
                >
                  <span className="truncate font-mono text-[12.5px] text-foreground">
                    {entry.full_name}
                  </span>
                  {entry.collected ? (
                    <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-state-open">
                      <Check className="size-3" />
                      Collected
                    </span>
                  ) : (
                    <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-muted-foreground">
                      <CircleDashed className="size-3" />
                      Pending
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="tracked-state" className="text-xs font-medium">
                Issue state
              </Label>
              <Select value={state} onValueChange={(next) => setState(next as IssueState)}>
                <SelectTrigger id="tracked-state" className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tracked-limit" className="text-xs font-medium">
                Issue limit
              </Label>
              <Input
                id="tracked-limit"
                type="number"
                min={1}
                max={500}
                value={limit}
                onChange={(event) => setLimit(event.target.value)}
                className="num w-24"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Collecting all
                </>
              ) : (
                <>
                  <Play className="size-3.5" />
                  Collect all tracked
                </>
              )}
            </Button>
          </div>

          {mutation.isPending ? (
            <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Collecting every tracked repository — this can take a while.
            </div>
          ) : null}

          {mutation.data && !mutation.isPending ? (
            <ResultBanner ok={mutation.data.ok} message={mutation.data.message} />
          ) : null}
          {mutation.isError ? (
            <ResultBanner ok={false} message="The tracked collection run failed." />
          ) : null}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
