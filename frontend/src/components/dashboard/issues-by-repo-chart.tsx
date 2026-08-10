"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { IssuesByRepoPoint } from "@/lib/ui-api";

const axisProps = {
  stroke: "var(--color-border-strong)",
  tick: { fill: "var(--color-muted-foreground)", fontSize: 11 },
  tickLine: false,
} as const;

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-raised">
      <p className="font-medium text-popover-foreground">{label}</p>
      <ul className="mt-1.5 space-y-1">
        {payload.map((entry) => (
          <li key={entry.name} className="flex items-center gap-2 text-muted-foreground">
            <span
              className="size-2 rounded-sm"
              style={{ backgroundColor: entry.color }}
              aria-hidden
            />
            <span className="capitalize">{entry.name}</span>
            <span className="num ml-auto font-medium text-popover-foreground">
              {entry.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function IssuesByRepoChart({ data }: { data: IssuesByRepoPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-xs text-muted-foreground">
        No issues stored yet.
      </div>
    );
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 24, left: 0 }} barGap={2}>
          <CartesianGrid
            stroke="var(--color-chart-grid)"
            strokeDasharray="2 4"
            vertical={false}
          />
          <XAxis
            dataKey="short_name"
            {...axisProps}
            interval={0}
            angle={-18}
            textAnchor="end"
            height={48}
            label={{
              value: "Repository",
              position: "insideBottom",
              offset: -18,
              fill: "var(--color-muted-foreground)",
              fontSize: 11,
            }}
          />
          <YAxis
            {...axisProps}
            allowDecimals={false}
            width={44}
            label={{
              value: "Issues stored",
              angle: -90,
              position: "insideLeft",
              fill: "var(--color-muted-foreground)",
              fontSize: 11,
            }}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--color-accent)" }} />
          <Legend
            verticalAlign="top"
            align="right"
            height={28}
            iconType="square"
            iconSize={8}
            formatter={(value) => (
              <span className="text-xs capitalize text-muted-foreground">{value}</span>
            )}
          />
          <Bar
            dataKey="open"
            name="open"
            stackId="issues"
            fill="var(--color-state-open)"
            radius={[0, 0, 0, 0]}
            maxBarSize={38}
          />
          <Bar
            dataKey="closed"
            name="closed"
            stackId="issues"
            fill="var(--color-state-closed)"
            radius={[3, 3, 0, 0]}
            maxBarSize={38}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
