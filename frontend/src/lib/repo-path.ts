export function parseIssuesPagePath(
  pathname: string,
): { owner: string; repo: string } | null {
  const match = pathname.match(/^\/repos\/([^/]+)\/([^/]+)\/issues\/?$/);
  if (!match) return null;

  const owner = decodeURIComponent(match[1]);
  const repo = decodeURIComponent(match[2]);
  if (owner === "_" && repo === "_") return null;

  return { owner, repo };
}
