import type { ReactNode } from "react";

/**
 * Shared page-header treatment. Every top-level screen uses this so titles,
 * descriptions and the trailing meta/actions slot stay identical.
 */
export function PageHeader({
  title,
  description,
  meta,
  actions,
  mono,
  above,
}: {
  title: string;
  description?: string;
  meta?: ReactNode;
  actions?: ReactNode;
  mono?: boolean;
  above?: ReactNode;
}) {
  return (
    <div className="space-y-3">
      {above}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1
            className={
              mono
                ? "font-mono text-lg font-semibold text-foreground"
                : "text-xl font-semibold text-foreground"
            }
          >
            {title}
          </h1>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          {meta ? <span className="num text-xs text-muted-foreground">{meta}</span> : null}
          {actions}
        </div>
      </div>
    </div>
  );
}
