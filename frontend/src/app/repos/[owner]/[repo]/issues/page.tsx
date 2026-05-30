import { IssuesPageClient } from "./issues-page-client";

export function generateStaticParams() {
  return [{ owner: "_", repo: "_" }];
}

export default function RepoIssuesPage() {
  return <IssuesPageClient />;
}
