/**
 * Adapter between the UI components and the real tissue-api client in `./api`.
 *
 * The components were designed against plain arrays and `{ ok, message }`
 * action results; the backend returns paginated envelopes and throws ApiError.
 * Everything that reconciles those two shapes lives here so `./api` stays a
 * faithful description of the HTTP surface.
 */

import * as api from "./api";
import { ApiError } from "./types";
import type { Issue, Repo, Resolution, TrackedRepo } from "./types";

/** How many rows we pull when a screen wants "everything". */
const PAGE = 200;

export type ActionResult = { ok: boolean; message: string };

export type IssueState = "open" | "closed" | "all";

function message(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

/** `all` means "no filter" to the backend. */
function stateParam(state: IssueState | undefined): string | undefined {
  return state && state !== "all" ? state : undefined;
}

/* ---------- Repos ---------- */

export async function listRepos(): Promise<Repo[]> {
  const data = await api.listRepos(PAGE, 0);
  return data.items;
}

export async function getRepo(owner: string, name: string): Promise<Repo | null> {
  try {
    return await api.getRepo(owner, name);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function listTrackedRepos(): Promise<TrackedRepo[]> {
  const data = await api.listTrackedRepos();
  return data.items;
}

export async function collectRepo(owner: string, name: string): Promise<ActionResult> {
  try {
    const result = await api.collectRepo(owner, name);
    return { ok: true, message: result.message };
  } catch (error) {
    return { ok: false, message: message(error, `Could not collect ${owner}/${name}.`) };
  }
}

export async function collectAllTracked(params: {
  limit: number;
  state: IssueState;
}): Promise<ActionResult> {
  try {
    const result = await api.collectTrackedRepos({
      issueLimit: params.limit,
      issueState: stateParam(params.state),
    });
    return { ok: true, message: result.message };
  } catch (error) {
    return { ok: false, message: message(error, "The tracked collection run failed.") };
  }
}

/* ---------- Issues ---------- */

export async function listIssues(params: {
  owner: string;
  repo: string;
  state?: IssueState;
}): Promise<Issue[]> {
  const data = await api.listIssues(params.owner, params.repo, {
    state: stateParam(params.state),
    limit: PAGE,
  });
  return data.items;
}

export async function getIssue(
  owner: string,
  repo: string,
  number: number,
): Promise<Issue | null> {
  try {
    return await api.getIssue(owner, repo, number);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function collectIssues(
  owner: string,
  repo: string,
  params: { state: IssueState; limit: number },
): Promise<ActionResult> {
  try {
    const result = await api.collectIssues(owner, repo, {
      state: stateParam(params.state),
      limit: params.limit,
    });
    return { ok: true, message: result.message };
  } catch (error) {
    return { ok: false, message: message(error, "The issue collection request failed.") };
  }
}

export type ResolveResult = ActionResult & { thread_id: string | null };

export async function resolveIssue(
  owner: string,
  repo: string,
  number: number,
): Promise<ResolveResult> {
  try {
    const result = await api.resolveIssue(owner, repo, number);
    return {
      ok: true,
      message: `Resolution started for ${owner}/${repo}#${number}.`,
      thread_id: result.thread_id,
    };
  } catch (error) {
    return {
      ok: false,
      message: message(error, "The agent could not resolve this issue."),
      thread_id: null,
    };
  }
}

/* ---------- Resolutions ---------- */

export async function listResolutions(): Promise<Resolution[]> {
  const data = await api.listResolutions({ limit: PAGE });
  return data.items;
}

/* ---------- Dashboard aggregates ---------- */

export type DashboardStats = {
  repos_tracked: number;
  repos_collected: number;
  issues_stored: number;
  issues_open: number;
  issues_closed: number;
  resolutions_generated: number;
  resolutions_proposed: number;
  issues_last_7_days: number;
  repos_last_7_days: number;
};

export type IssuesByRepoPoint = {
  full_name: string;
  short_name: string;
  open: number;
  closed: number;
};

export type ResolutionsOverTimePoint = {
  date: string;
  label: string;
  proposed: number;
  analysing: number;
  pending: number;
  failed: number;
};

export type ActivityItem = {
  id: string;
  kind: "repo" | "issue" | "resolution";
  title: string;
  subtitle: string;
  meta: string | null;
  timestamp: string;
};

export type DashboardData = {
  stats: DashboardStats;
  issuesByRepo: IssuesByRepoPoint[];
  resolutionsOverTime: ResolutionsOverTimePoint[];
  activity: ActivityItem[];
  partial: boolean;
};

const DAY_MS = 86_400_000;

/**
 * The backend has no aggregate endpoint, so the dashboard is computed on the
 * client from the list endpoints: one call for repos, one for resolutions,
 * one for the tracked list, plus one per repo for issues.
 *
 * That is fine for the tracked scientific-library set but will not scale — a
 * `/api/stats` endpoint is the real fix. Repos whose issue fetch fails are
 * skipped and reported via `partial` rather than failing the whole page.
 */
export async function getDashboardData(
  options: { topRepos?: number; days?: number } = {},
): Promise<DashboardData> {
  const topRepos = options.topRepos ?? 6;
  const days = options.days ?? 10;

  const [repos, resolutions, tracked] = await Promise.all([
    listRepos(),
    listResolutions().catch(() => [] as Resolution[]),
    listTrackedRepos().catch(() => [] as TrackedRepo[]),
  ]);

  const settled = await Promise.allSettled(
    repos.map((repo) =>
      api.listIssues(repo.owner, repo.name, { limit: PAGE }).then((page) => page.items),
    ),
  );

  const partial = settled.some((entry) => entry.status === "rejected");
  const issuesByRepoId = new Map<number, Issue[]>();
  repos.forEach((repo, index) => {
    const entry = settled[index];
    issuesByRepoId.set(repo.id, entry?.status === "fulfilled" ? entry.value : []);
  });

  const allIssues = [...issuesByRepoId.values()].flat();
  const isOpen = (issue: Issue) => issue.state.toLowerCase() === "open";
  const openCount = allIssues.filter(isOpen).length;

  const weekAgo = Date.now() - 7 * DAY_MS;
  const withinWeek = (iso: string | null) =>
    iso !== null && !Number.isNaN(Date.parse(iso)) && Date.parse(iso) >= weekAgo;

  const stats: DashboardStats = {
    repos_tracked: tracked.length || repos.length,
    repos_collected: repos.length,
    issues_stored: allIssues.length,
    issues_open: openCount,
    issues_closed: allIssues.length - openCount,
    resolutions_generated: resolutions.length,
    resolutions_proposed: resolutions.filter((r) => r.status === "proposed").length,
    issues_last_7_days: allIssues.filter((i) => withinWeek(i.collected_at)).length,
    repos_last_7_days: repos.filter((r) => withinWeek(r.collected_at)).length,
  };

  const issuesByRepo: IssuesByRepoPoint[] = repos
    .map((repo) => {
      const repoIssues = issuesByRepoId.get(repo.id) ?? [];
      return {
        full_name: repo.full_name,
        short_name: repo.name,
        open: repoIssues.filter(isOpen).length,
        closed: repoIssues.filter((issue) => !isOpen(issue)).length,
      };
    })
    .sort((a, b) => b.open + b.closed - (a.open + a.closed))
    .slice(0, topRepos);

  const startOfToday = new Date().setHours(0, 0, 0, 0);
  const resolutionsOverTime: ResolutionsOverTimePoint[] = Array.from(
    { length: days },
    (_, index) => {
      const dayStart = startOfToday - (days - 1 - index) * DAY_MS;
      const iso = new Date(dayStart).toISOString().slice(0, 10);
      const onDay = resolutions.filter((r) => r.created_at.slice(0, 10) === iso);
      return {
        date: iso,
        label: new Date(dayStart).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
        }),
        proposed: onDay.filter((r) => r.status === "proposed").length,
        analysing: onDay.filter((r) => r.status === "analysing").length,
        pending: onDay.filter((r) => r.status === "pending").length,
        failed: onDay.filter((r) => r.status === "failed").length,
      };
    },
  );

  const reposById = new Map(repos.map((repo) => [repo.id, repo]));
  const activity: ActivityItem[] = [
    ...repos.map<ActivityItem>((repo) => ({
      id: `repo-${repo.id}`,
      kind: "repo",
      title: repo.full_name,
      subtitle: repo.description ?? "Repository collected",
      meta: `${repo.stars.toLocaleString("en-GB")} stars`,
      timestamp: repo.collected_at,
    })),
    ...allIssues.map<ActivityItem>((issue) => ({
      id: `issue-${issue.id}`,
      kind: "issue",
      title: issue.title,
      subtitle: `${reposById.get(issue.repo_id)?.full_name ?? "unknown"} #${issue.number}`,
      meta: issue.state,
      timestamp: issue.collected_at,
    })),
    ...resolutions.map<ActivityItem>((resolution) => ({
      id: `resolution-${resolution.id}`,
      kind: "resolution",
      title: resolution.issue_title,
      subtitle: `${resolution.full_name} #${resolution.issue_number}`,
      meta: resolution.status,
      timestamp: resolution.created_at,
    })),
  ]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 12);

  return { stats, issuesByRepo, resolutionsOverTime, activity, partial };
}
