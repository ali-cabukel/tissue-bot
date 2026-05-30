import type { Issue, Repo } from "./types";

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

function matchesText(value: string | null | undefined, query: string): boolean {
  return value?.toLowerCase().includes(query) ?? false;
}

export function filterRepos(repos: Repo[], query: string): Repo[] {
  const q = normalizeQuery(query);
  if (!q) return repos;

  return repos.filter(
    (repo) =>
      matchesText(repo.full_name, q) ||
      matchesText(repo.owner, q) ||
      matchesText(repo.name, q) ||
      matchesText(repo.description, q) ||
      matchesText(repo.language, q) ||
      matchesText(repo.license, q) ||
      repo.topics.some((topic) => topic.toLowerCase().includes(q)),
  );
}

export function filterIssues(issues: Issue[], query: string): Issue[] {
  const q = normalizeQuery(query);
  if (!q) return issues;

  const numberQuery = Number(q.replace(/^#/, ""));

  return issues.filter(
    (issue) =>
      (Number.isInteger(numberQuery) && issue.number === numberQuery) ||
      matchesText(issue.title, q) ||
      matchesText(issue.author, q) ||
      matchesText(issue.state, q) ||
      matchesText(issue.body, q) ||
      issue.labels.some((label) => label.toLowerCase().includes(q)),
  );
}
