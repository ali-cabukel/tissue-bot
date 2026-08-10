const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? "—" : dateFormatter.format(parsed);
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? "—" : `${dateTimeFormatter.format(parsed)} UTC`;
}

export function formatCount(value: number): string {
  return value.toLocaleString("en-GB");
}

export function formatCompact(value: number): string {
  return value >= 1000
    ? `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}k`
    : String(value);
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "—";
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return "—";

  const seconds = Math.max(0, Math.round((Date.now() - parsed) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.round(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return formatDate(iso);
}

/** Day bucket used to group chat threads in the sidebar. */
export function dayBucket(iso: string): "today" | "yesterday" | "earlier" {
  const day = 86_400_000;
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return "earlier";
  if (parsed >= startOfToday) return "today";
  if (parsed >= startOfToday - day) return "yesterday";
  return "earlier";
}
