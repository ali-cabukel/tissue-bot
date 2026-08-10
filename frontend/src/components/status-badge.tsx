import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  open: "bg-state-open-soft text-state-open",
  closed: "bg-state-closed-soft text-state-closed",
  proposed: "bg-status-proposed-soft text-status-proposed",
  analysing: "bg-status-analysing-soft text-status-analysing",
  pending: "bg-status-pending-soft text-status-pending",
  failed: "bg-status-failed-soft text-status-failed",
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
        styles[status.toLowerCase()] ?? "bg-muted text-muted-foreground",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {status}
    </span>
  );
}
