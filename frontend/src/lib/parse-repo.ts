/** Accepts "owner/name", a full GitHub URL, or a git clone URL. */
export function parseRepoInput(raw: string): { owner: string; name: string } | null {
  const value = raw.trim();
  if (!value) return null;

  const withoutProtocol = value
    .replace(/^git\+/, "")
    .replace(/^https?:\/\//, "")
    .replace(/^git@github\.com:/, "github.com/")
    .replace(/^www\./, "");

  const path = withoutProtocol.startsWith("github.com/")
    ? withoutProtocol.slice("github.com/".length)
    : withoutProtocol;

  const segments = path.split("?")[0]!.split("#")[0]!.split("/").filter(Boolean);
  if (segments.length < 2) return null;

  const owner = segments[0]!;
  const name = segments[1]!.replace(/\.git$/, "");
  if (!/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(name)) return null;

  return { owner, name };
}
