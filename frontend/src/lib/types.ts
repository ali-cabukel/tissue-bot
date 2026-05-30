export interface User {
  id: string;
  email: string;
  is_active: boolean;
  is_superuser: boolean;
  is_verified: boolean;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface Repo {
  id: number;
  owner: string;
  name: string;
  full_name: string;
  description: string | null;
  url: string;
  stars: number;
  forks: number;
  language: string | null;
  is_private: boolean;
  is_fork: boolean;
  is_archived: boolean;
  license: string | null;
  default_branch: string | null;
  created_at: string | null;
  updated_at: string | null;
  pushed_at: string | null;
  topics: string[];
  collected_at: string;
}

export interface Issue {
  id: number;
  repo_id: number;
  number: number;
  title: string;
  state: string;
  body: string | null;
  author: string | null;
  url: string;
  labels: string[];
  created_at: string | null;
  updated_at: string | null;
  collected_at: string;
}

export interface CollectResult {
  full_name: string;
  collected: number;
  message: string;
}

export interface PaginatedRepos {
  items: Repo[];
  limit: number;
  offset: number;
  count: number;
}

export interface PaginatedIssues {
  items: Issue[];
  full_name: string;
  limit: number;
  offset: number;
  count: number;
}

export interface ChatThread {
  id: string;
  title: string | null;
  issue_full_name: string | null;
  issue_number: number | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: number;
  thread_id: string;
  role: string;
  content: string;
  created_at: string;
}

export interface ChatReply {
  thread_id: string;
  message: ChatMessage;
  reply: ChatMessage;
}

export interface Resolution {
  id: number;
  issue_id: number;
  full_name: string;
  issue_number: number;
  issue_title: string;
  status: string;
  summary: string | null;
  proposed_fix: string | null;
  analysis: string | null;
  thread_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResolutions {
  items: Resolution[];
  count: number;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
