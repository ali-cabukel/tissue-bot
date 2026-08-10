import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function StatTile({
  label,
  value,
  detail,
  icon,
  loading,
}: {
  label: string;
  value: number;
  detail: string;
  icon?: ReactNode;
  loading?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-subtle">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {icon ? <span className="text-muted-foreground">{icon}</span> : null}
      </div>
      <div
        className={cn(
          "mt-3 num text-3xl font-semibold leading-none text-foreground",
          loading && "animate-pulse text-muted-foreground",
        )}
      >
        {loading ? "—" : value.toLocaleString("en-GB")}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}
