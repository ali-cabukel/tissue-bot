import { CircleDot, GitBranch, Sparkles } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import type { ActivityItem } from "@/lib/ui-api";

const kindMeta = {
  repo: { icon: GitBranch, label: "Repository collected" },
  issue: { icon: CircleDot, label: "Issue stored" },
  resolution: { icon: Sparkles, label: "Resolution generated" },
} as const;

function formatTimestamp(iso: string) {
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return "—";
  return new Date(parsed).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

export function ActivityTimeline({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-xs text-muted-foreground">
        Nothing collected yet. Activity appears here once repositories and issues are stored.
      </p>
    );
  }

  return (
    <ol className="-my-1">
      {items.map((item, index) => {
        const meta = kindMeta[item.kind];
        const Icon = meta.icon;
        const isLast = index === items.length - 1;

        return (
          <li key={item.id} className="relative flex gap-3 py-2.5 pl-1">
            {!isLast ? (
              <span
                className="absolute left-[13px] top-9 bottom-0 w-px bg-border"
                aria-hidden
              />
            ) : null}
            <span className="relative z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground">
              <Icon className="size-3" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <p className="truncate text-[13px] font-medium text-foreground">
                  {item.title}
                </p>
                <span className="num shrink-0 text-[11px] text-muted-foreground">
                  {formatTimestamp(item.timestamp)}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="truncate font-mono text-[11px] text-muted-foreground">
                  {item.subtitle}
                </span>
                {item.kind === "repo" ? (
                  <span className="num shrink-0 text-[11px] text-muted-foreground">
                    {item.meta}
                  </span>
                ) : item.meta ? (
                  <StatusBadge status={item.meta} />
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
