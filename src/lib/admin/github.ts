/**
 * The few GitHub REST calls the admin area needs, over plain `fetch` (no SDK).
 * `fetch` comes in as an argument so tests never reach the real API.
 *
 * Reads are pinned to a commit: the ref is resolved first and the file is read
 * at that sha, so the content and the sha a later save compares against always
 * belong together.
 *
 * Writes go through the Git Data API (blobs → tree → commit → ref), so every
 * file of a save lands in one commit, and the ref moves only as a fast forward
 * of the commit the editor read (spec #3, #11).
 */

export type GitHubConfig = {
  /** Optional for reads: the repository is public. Required for writes. */
  token?: string;
  /** "owner/name". */
  repository: string;
  branch: string;
  /**
   * Base of the REST API, without a trailing slash. Unset in production
   * (`https://api.github.com`); the e2e suite points it at a local fake.
   */
  apiUrl?: string;
};

/** `process.env` or a test double; only the GITHUB_* keys below are read. */
export type GitHubEnv = Readonly<Record<string, string | undefined>>;

export type GitHubErrorCode = "github_unauthorized" | "github_unavailable";

export type GitHubResult<T, E extends string = GitHubErrorCode> =
  { ok: true; value: T } | { ok: false; error: E };

export type FetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

const DEFAULT_API = "https://api.github.com";
const REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const BRANCH = /^[A-Za-z0-9_./-]+$/;
const SHA = /^[0-9a-f]{40}$/;

function readApiUrl(value: string | undefined): string | null | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.href.replace(/\/+$/, "");
  } catch {
    return null;
  }
}

export function readGitHubConfig(
  env: GitHubEnv = process.env,
): GitHubConfig | null {
  const repository = env.GITHUB_REPOSITORY?.trim();
  const branch = env.GITHUB_BRANCH?.trim() || "main";
  if (!repository || !REPOSITORY.test(repository)) return null;
  if (repository.split("/").some((part) => /^\.+$/.test(part))) return null;
  if (!BRANCH.test(branch) || branch.includes("..")) return null;

  const apiUrl = readApiUrl(env.GITHUB_API_URL);
  if (apiUrl === null) return null;

  return {
    repository,
    branch,
    token: env.GITHUB_TOKEN?.trim() || undefined,
    ...(apiUrl ? { apiUrl } : {}),
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

function repoUrl(config: GitHubConfig, path: string): string {
  return `${config.apiUrl ?? DEFAULT_API}/repos/${config.repository}${path}`;
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

/** Reads `body.<key>.sha` (or `body.sha` without a key) as a git sha. */
async function shaFrom(
  response: Response,
  key?: "object" | "tree",
): Promise<string | null> {
  const body: unknown = await response.json().catch(() => null);
  if (typeof body !== "object" || body === null) return null;
  const holder = key ? (body as Record<string, unknown>)[key] : body;
  const sha =
    typeof holder === "object" && holder !== null
      ? (holder as { sha?: unknown }).sha
      : undefined;
  return typeof sha === "string" && SHA.test(sha) ? sha : null;
}

/** The sha of the commit the branch points to right now. */
export async function readBranchSha(
  config: GitHubConfig,
  fetchImpl: FetchLike,
): Promise<GitHubResult<string>> {
  const response = await call(
    fetchImpl,
    repoUrl(config, `/git/ref/heads/${encodePath(config.branch)}`),
    { headers: headers(config, "application/vnd.github+json") },
  );
  if (!response.ok) return response;

  const sha = await shaFrom(response.value, "object");
  return sha
    ? { ok: true, value: sha }
    : { ok: false, error: "github_unavailable" };
}

/** A file's content at an exact commit. */
export async function readRepoFileAt(
  config: GitHubConfig,
  path: string,
  commitSha: string,
  fetchImpl: FetchLike,
): Promise<GitHubResult<string>> {
  const response = await call(
    fetchImpl,
    repoUrl(config, `/contents/${encodePath(path)}?ref=${commitSha}`),
    { headers: headers(config, "application/vnd.github.raw+json") },
  );
  if (!response.ok) return response;
  return { ok: true, value: await response.value.text() };
}

export async function readRepoFile(
  config: GitHubConfig,
  path: string,
  fetchImpl: FetchLike,
): Promise<GitHubResult<{ content: string; commitSha: string }>> {
  const commitSha = await readBranchSha(config, fetchImpl);
  if (!commitSha.ok) return commitSha;

  const content = await readRepoFileAt(
    config,
    path,
    commitSha.value,
    fetchImpl,
  );
  if (!content.ok) return content;

  return {
    ok: true,
    value: { content: content.value, commitSha: commitSha.value },
  };
}

export type CommitFile = {
  path: string;
  /** Bytes for binary files, a string for text (sent as UTF-8). */
  content: Uint8Array | string;
};

export type CommitRequest = {
  /** The commit the editor read; the new commit's only parent. */
  baseSha: string;
  files: CommitFile[];
  /** Paths removed in the same commit. */
  deletions?: string[];
  message: string;
};

export type CommitErrorCode = GitHubErrorCode | "version_conflict";

function toBase64(content: Uint8Array | string): string {
  return typeof content === "string"
    ? Buffer.from(content, "utf8").toString("base64")
    : Buffer.from(content).toString("base64");
}

/**
 * One commit with every file of `request`, on top of `baseSha`. The branch is
 * moved without `force`: if anything was pushed after `baseSha`, GitHub
 * refuses the fast forward and nothing changes (`version_conflict`). Blobs,
 * trees and commits created before that point are unreachable and harmless.
 */
export async function commitFiles(
  config: GitHubConfig,
  request: CommitRequest,
  fetchImpl: FetchLike,
): Promise<GitHubResult<string, CommitErrorCode>> {
  if (!config.token) return { ok: false, error: "github_unauthorized" };

  const json = (body: unknown, method = "POST"): RequestInit => ({
    method,
    headers: {
      ...headers(config, "application/vnd.github+json"),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const unavailable = { ok: false, error: "github_unavailable" } as const;

  const tree: {
    path: string;
    mode: "100644";
    type: "blob";
    sha: string | null;
  }[] = [];
  for (const file of request.files) {
    const blob = await call(
      fetchImpl,
      repoUrl(config, "/git/blobs"),
      json({ content: toBase64(file.content), encoding: "base64" }),
    );
    if (!blob.ok) return blob;
    const sha = await shaFrom(blob.value);
    if (!sha) return unavailable;
    tree.push({ path: file.path, mode: "100644", type: "blob", sha });
  }
  for (const path of request.deletions ?? []) {
    tree.push({ path, mode: "100644", type: "blob", sha: null });
  }

  const base = await call(
    fetchImpl,
    repoUrl(config, `/git/commits/${request.baseSha}`),
    { headers: headers(config, "application/vnd.github+json") },
  );
  if (!base.ok) return base;
  const baseTree = await shaFrom(base.value, "tree");
  if (!baseTree) return unavailable;

  const newTree = await call(
    fetchImpl,
    repoUrl(config, "/git/trees"),
    json({ base_tree: baseTree, tree }),
  );
  if (!newTree.ok) return newTree;
  const treeSha = await shaFrom(newTree.value);
  if (!treeSha) return unavailable;

  // No author: GitHub records the token's owner, which is who really saved.
  const commit = await call(
    fetchImpl,
    repoUrl(config, "/git/commits"),
    json({
      message: request.message,
      tree: treeSha,
      parents: [request.baseSha],
    }),
  );
  if (!commit.ok) return commit;
  const commitSha = await shaFrom(commit.value);
  if (!commitSha) return unavailable;

  try {
    const ref = await fetchImpl(
      repoUrl(config, `/git/refs/heads/${encodePath(config.branch)}`),
      { ...json({ sha: commitSha, force: false }, "PATCH"), cache: "no-store" },
    );
    // 422 "Update is not a fast forward": the branch moved after baseSha.
    if (ref.status === 422) return { ok: false, error: "version_conflict" };
    if (!ref.ok) return { ok: false, error: errorFor(ref.status) };
  } catch {
    return unavailable;
  }

  return { ok: true, value: commitSha };
}
