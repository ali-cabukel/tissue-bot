"use client";

import { useMutation } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { useState, type FormEvent } from "react";

import { ResultBanner } from "@/components/result-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseRepoInput } from "@/lib/parse-repo";
import { collectRepo, type ActionResult } from "@/lib/ui-api";

export function CollectRepoForm({ onCollected }: { onCollected?: () => void }) {
  const [value, setValue] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);

  const mutation = useMutation<ActionResult, Error, { owner: string; name: string }>({
    mutationFn: ({ owner, name }) => collectRepo(owner, name),
    onSuccess: (result) => {
      if (result.ok) onCollected?.();
    },
  });

  const parsed = parseRepoInput(value);

  function submit(event: FormEvent) {
    event.preventDefault();
    mutation.reset();
    if (!parsed) {
      setParseError("Enter owner/name or a GitHub repository URL.");
      return;
    }
    setParseError(null);
    mutation.mutate(parsed);
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="repo-input" className="text-xs font-medium">
          Repository
        </Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="repo-input"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setParseError(null);
            }}
            placeholder="scipy/scipy or https://github.com/scipy/scipy"
            autoComplete="off"
            spellCheck={false}
            className="font-mono text-[13px]"
            aria-invalid={parseError !== null}
          />
          <Button type="submit" disabled={mutation.isPending} className="sm:w-36">
            {mutation.isPending ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Collecting
              </>
            ) : (
              <>
                <Plus className="size-3.5" />
                Collect
              </>
            )}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {parsed
            ? `Will collect ${parsed.owner}/${parsed.name}.`
            : "Accepts owner/name or a full GitHub URL."}
        </p>
      </div>

      {parseError ? <ResultBanner ok={false} message={parseError} /> : null}

      {mutation.isPending ? (
        <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          Fetching repository metadata and issues from GitHub…
        </div>
      ) : null}

      {mutation.data && !mutation.isPending ? (
        <ResultBanner ok={mutation.data.ok} message={mutation.data.message} />
      ) : null}

      {mutation.isError ? (
        <ResultBanner ok={false} message="The collection request failed. Try again." />
      ) : null}
    </form>
  );
}
