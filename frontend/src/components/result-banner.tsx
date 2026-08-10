import { AlertCircle, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";

export function ResultBanner({
  ok,
  message,
  className,
}: {
  ok: boolean;
  message: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-2 rounded-md border px-3 py-2 text-xs",
        ok
          ? "border-state-open/30 bg-state-open-soft text-state-open"
          : "border-status-failed/30 bg-status-failed-soft text-status-failed",
        className,
      )}
    >
      {ok ? (
        <CheckCircle2 className="mt-px size-3.5 shrink-0" />
      ) : (
        <AlertCircle className="mt-px size-3.5 shrink-0" />
      )}
      <span className="leading-relaxed">{message}</span>
    </div>
  );
}
