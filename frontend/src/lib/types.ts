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

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
