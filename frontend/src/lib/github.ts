export function githubProfileUrl(username: string): string {
  return `https://github.com/${encodeURIComponent(username)}`;
}
