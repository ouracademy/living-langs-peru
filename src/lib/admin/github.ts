/**
 * The few GitHub REST calls the admin area needs, over plain `fetch` (no SDK).
 * `fetch` comes in as an argument so tests never reach the real API.
 *
 * Reads are pinned to a commit: the ref is resolved first and the file is read
 * at that sha, so the content and the sha a later save compares against always
 * belong together.
 */

export type GitHubConfig = {
  /** Optional for reads: the repository is public. */
  token?: string;
  /** "owner/name". */
  repository: string;
  branch: string;
};

/** `process.env` or a test double; only the GITHUB_* keys below are read. */
export type GitHubEnv = Readonly<Record<string, string | undefined>>;

export type GitHubErrorCode = "github_unauthorized" | "github_unavailable";

export type GitHubResult<T> =
  { ok: true; value: T } | { ok: false; error: GitHubErrorCode };

export type FetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

const API = "https://api.github.com";
const REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const BRANCH = /^[A-Za-z0-9_./-]+$/;

export function readGitHubConfig(
  env: GitHubEnv = process.env,
): GitHubConfig | null {
  const repository = env.GITHUB_REPOSITORY?.trim();
  const branch = env.GITHUB_BRANCH?.trim() || "main";
  if (!repository || !REPOSITORY.test(repository)) return null;
  if (repository.split("/").some((part) => /^\.+$/.test(part))) return null;
  if (!BRANCH.test(branch) || branch.includes("..")) return null;

  return {
    repository,
    branch,
    token: env.GITHUB_TOKEN?.trim() || undefined,
  };
}

function headers(config: GitHubConfig, accept: string): HeadersInit {
  return {
    Accept: accept,
    "X-GitHub-Api-Version": "2022-11-28",
    // GitHub rejects API calls without a User-Agent.
    "User-Agent": "living-langs-peru-admin",
    ...(config.token ? { Authorization: `Bearer ${config.token}` } : {}),
  };
}

function errorFor(status: number): GitHubErrorCode {
  return status === 401 || status === 403
    ? "github_unauthorized"
    : "github_unavailable";
}

function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function call(
  fetchImpl: FetchLike,
  url: string,
  init: RequestInit,
): Promise<GitHubResult<Response>> {
  try {
    const response = await fetchImpl(url, { ...init, cache: "no-store" });
    if (!response.ok) return { ok: false, error: errorFor(response.status) };
    return { ok: true, value: response };
  } catch {
    // Network failure: nothing in the error is worth showing to a person.
    return { ok: false, error: "github_unavailable" };
  }
}

/** The sha of the commit the branch points to right now. */
export async function readBranchSha(
  config: GitHubConfig,
  fetchImpl: FetchLike,
): Promise<GitHubResult<string>> {
  const response = await call(
    fetchImpl,
    `${API}/repos/${config.repository}/git/ref/heads/${encodePath(config.branch)}`,
    { headers: headers(config, "application/vnd.github+json") },
  );
  if (!response.ok) return response;

  const body: unknown = await response.value.json().catch(() => null);
  const sha =
    typeof body === "object" && body !== null && "object" in body
      ? (body as { object?: { sha?: unknown } }).object?.sha
      : undefined;
  if (typeof sha !== "string" || !/^[0-9a-f]{40}$/.test(sha)) {
    return { ok: false, error: "github_unavailable" };
  }
  return { ok: true, value: sha };
}

export async function readRepoFile(
  config: GitHubConfig,
  path: string,
  fetchImpl: FetchLike,
): Promise<GitHubResult<{ content: string; commitSha: string }>> {
  const commitSha = await readBranchSha(config, fetchImpl);
  if (!commitSha.ok) return commitSha;

  const response = await call(
    fetchImpl,
    `${API}/repos/${config.repository}/contents/${encodePath(path)}?ref=${commitSha.value}`,
    { headers: headers(config, "application/vnd.github.raw+json") },
  );
  if (!response.ok) return response;

  return {
    ok: true,
    value: { content: await response.value.text(), commitSha: commitSha.value },
  };
}
