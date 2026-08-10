"use client";

import { useMutation } from "@tanstack/react-query";
import { DownloadCloud, Loader2 } from "lucide-react";
import { useState } from "react";

import { ResultBanner } from "@/components/result-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { collectIssues, type ActionResult, type IssueState } from "@/lib/ui-api";

export function CollectIssuesForm({
  owner,
  repo,
  onCollected,
}: {
  owner: string;
  repo: string;
  onCollected?: () => void;
}) {
  const [state, setState] = useState<IssueState>("open");
  const [limit, setLimit] = useState("50");

  const mutation = useMutation<ActionResult, Error, void>({
    mutationFn: () => collectIssues(owner, repo, { state, limit: Number(limit) || 50 }),
    onSuccess: (result) => {
      if (result.ok) onCollected?.();
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="issues-state" className="text-xs font-medium">
            Issue state
          </Label>
          <Select value={state} onValueChange={(next) => setState(next as IssueState)}>
            <SelectTrigger id="issues-state" className="w-32">
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
          <Label htmlFor="issues-limit" className="text-xs font-medium">
            Limit
          </Label>
          <Input
            id="issues-limit"
            type="number"
            min={1}
            max={500}
            value={limit}
            onChange={(event) => setLimit(event.target.value)}
            className="num w-24"
          />
        </div>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Collecting
            </>
          ) : (
            <>
              <DownloadCloud className="size-3.5" />
              Collect issues
            </>
          )}
        </Button>
      </div>

      {mutation.isPending ? (
        <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          Paging the GitHub issues API for {owner}/{repo}…
        </div>
      ) : null}

      {mutation.data && !mutation.isPending ? (
        <ResultBanner ok={mutation.data.ok} message={mutation.data.message} />
      ) : null}

      {mutation.isError ? (
        <ResultBanner ok={false} message="The issue collection request failed." />
      ) : null}
    </div>
  );
}
