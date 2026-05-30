import { clearToken, getToken } from "./auth-storage";
import type {
  ChatMessage,
  ChatReply,
  ChatThread,
  CollectResult,
  Issue,
  PaginatedIssues,
  PaginatedRepos,
  PaginatedResolutions,
  Repo,
  Resolution,
  TokenResponse,
  User,
} from "./types";
import { ApiError } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

async function parseError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail)) {
      return data.detail.map((d: { msg?: string }) => d.msg ?? "Error").join(", ");
    }
    return response.statusText || "Request failed";
  } catch {
    return response.statusText || "Request failed";
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  authenticated = true,
): Promise<T> {
  const headers = new Headers(options.headers);

  if (authenticated) {
    const token = getToken();
    if (!token) {
      throw new ApiError("Not authenticated", 401);
    }
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !(options.body instanceof URLSearchParams) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401 && authenticated) {
      clearToken();
    }
    throw new ApiError(await parseError(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function login(email: string, password: string): Promise<TokenResponse> {
  const body = new URLSearchParams({ username: email, password });
  return request<TokenResponse>(
    "/auth/jwt/login",
    { method: "POST", body },
    false,
  );
}

export async function register(email: string, password: string): Promise<User> {
  return request<User>(
    "/auth/register",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    },
    false,
  );
}

export async function getCurrentUser(): Promise<User> {
  return request<User>("/users/me");
}

export async function listRepos(limit = 50, offset = 0): Promise<PaginatedRepos> {
  return request<PaginatedRepos>(`/repos?limit=${limit}&offset=${offset}`);
}

export async function getRepo(owner: string, repo: string): Promise<Repo> {
  return request<Repo>(`/repos/${owner}/${repo}`);
}

export async function collectRepo(owner: string, repo: string): Promise<CollectResult> {
  return request<CollectResult>(`/repos/${owner}/${repo}/collect`, { method: "POST" });
}

export async function listIssues(
  owner: string,
  repo: string,
  params: { state?: string; limit?: number; offset?: number } = {},
): Promise<PaginatedIssues> {
  const search = new URLSearchParams();
  if (params.state) search.set("state", params.state);
  if (params.limit) search.set("limit", String(params.limit));
  if (params.offset) search.set("offset", String(params.offset));
  const query = search.toString();
  return request<PaginatedIssues>(
    `/repos/${owner}/${repo}/issues${query ? `?${query}` : ""}`,
  );
}

export async function getIssue(owner: string, repo: string, number: number): Promise<Issue> {
  return request<Issue>(`/repos/${owner}/${repo}/issues/${number}`);
}

export async function collectIssues(
  owner: string,
  repo: string,
  params: { state?: string; limit?: number } = {},
): Promise<CollectResult> {
  const search = new URLSearchParams();
  if (params.state) search.set("state", params.state);
  if (params.limit) search.set("limit", String(params.limit));
  const query = search.toString();
  return request<CollectResult>(
    `/repos/${owner}/${repo}/issues/collect${query ? `?${query}` : ""}`,
    { method: "POST" },
  );
}

export async function listChatThreads(): Promise<ChatThread[]> {
  return request<ChatThread[]>("/chat/threads");
}

export async function createChatThread(params: {
  title?: string;
  owner?: string;
  repo?: string;
  number?: number;
}): Promise<ChatThread> {
  return request<ChatThread>("/chat/threads", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function listChatMessages(threadId: string): Promise<ChatMessage[]> {
  return request<ChatMessage[]>(`/chat/threads/${threadId}/messages`);
}

export async function sendChatMessage(
  threadId: string,
  content: string,
): Promise<ChatReply> {
  return request<ChatReply>(`/chat/threads/${threadId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

export async function listResolutions(params: {
  q?: string;
  owner?: string;
  repo?: string;
  limit?: number;
} = {}): Promise<PaginatedResolutions> {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.owner) search.set("owner", params.owner);
  if (params.repo) search.set("repo", params.repo);
  if (params.limit) search.set("limit", String(params.limit));
  const query = search.toString();
  return request<PaginatedResolutions>(`/resolutions${query ? `?${query}` : ""}`);
}

export async function getResolution(id: number): Promise<Resolution> {
  return request<Resolution>(`/resolutions/${id}`);
}

export async function resolveIssue(
  owner: string,
  repo: string,
  number: number,
): Promise<ChatReply> {
  return request<ChatReply>(`/repos/${owner}/${repo}/issues/${number}/resolve`, {
    method: "POST",
  });
}
