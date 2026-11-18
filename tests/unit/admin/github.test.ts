import { describe, expect, it, vi } from "vitest";

import {
  type FetchLike,
  readGitHubConfig,
  readRepoFile,
} from "@/lib/admin/github";

const config = {
  token: "token-de-prueba",
  repository: "ouracademy/living-langs-peru",
  branch: "main",
};

const COMMIT_SHA = "a".repeat(40);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Answers the ref lookup, then the file read at that commit. */
function fakeGitHub(fileBody = '{"photos": []}\n') {
  return vi.fn<FetchLike>(async (input) => {
    const url = String(input);
    if (url.endsWith("/git/ref/heads/main")) {
      return json({ object: { sha: COMMIT_SHA, type: "commit" } });
    }
    if (url.includes("/contents/")) {
      return new Response(fileBody, { status: 200 });
    }
    return json({ message: "Not Found" }, 404);
  });
}

describe("readRepoFile", () => {
  // AC-E2-1
  it("returns the file content and the commit it was read at", async () => {
    const fetchMock = fakeGitHub('{"photos": [1]}\n');

    const result = await readRepoFile(
      config,
      "src/data/peoples/ashaninka.json",
      fetchMock,
    );

    expect(result).toEqual({
      ok: true,
      value: { content: '{"photos": [1]}\n', commitSha: COMMIT_SHA },
    });
  });

  it("reads the file at the exact commit of the ref, not the moving branch", async () => {
    const fetchMock = fakeGitHub();

    await readRepoFile(config, "src/data/peoples/ashaninka.json", fetchMock);

    const fileUrl = String(fetchMock.mock.calls[1][0]);
    expect(fileUrl).toBe(
      `https://api.github.com/repos/ouracademy/living-langs-peru/contents/src/data/peoples/ashaninka.json?ref=${COMMIT_SHA}`,
    );
  });

  it("sends the token, the API version and a raw Accept header without caching", async () => {
    const fetchMock = fakeGitHub();

    await readRepoFile(config, "src/data/peoples/ashaninka.json", fetchMock);

    const init = fetchMock.mock.calls[1][1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(headers.get("Authorization")).toBe("Bearer token-de-prueba");
    expect(headers.get("Accept")).toBe("application/vnd.github.raw+json");
    expect(headers.get("X-GitHub-Api-Version")).toBe("2022-11-28");
    expect(headers.get("User-Agent")).toBeTruthy();
    expect(init.cache).toBe("no-store");
  });

  it("works without a token, since the repository is public", async () => {
    const fetchMock = fakeGitHub();

    const result = await readRepoFile(
      { ...config, token: undefined },
      "src/data/peoples/ashaninka.json",
      fetchMock,
    );

    expect(result.ok).toBe(true);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(new Headers(init.headers).has("Authorization")).toBe(false);
  });

  // AC-E2-2
  it.each([401, 403])("maps %i to github_unauthorized", async (status) => {
    const fetchMock = vi.fn<FetchLike>(async () =>
      json({ message: "Bad" }, status),
    );

    const result = await readRepoFile(config, "a.json", fetchMock);

    expect(result).toEqual({ ok: false, error: "github_unauthorized" });
  });

  // AC-E2-2
  it.each([404, 500, 502])("maps %i to github_unavailable", async (status) => {
    const fetchMock = vi.fn<FetchLike>(async () =>
      json({ message: "Bad" }, status),
    );

    const result = await readRepoFile(config, "a.json", fetchMock);

    expect(result).toEqual({ ok: false, error: "github_unavailable" });
  });

  // AC-E2-2
  it("maps a network failure to github_unavailable", async () => {
    const fetchMock = vi.fn<FetchLike>(async () => {
      throw new TypeError("fetch failed");
    });

    const result = await readRepoFile(config, "a.json", fetchMock);

    expect(result).toEqual({ ok: false, error: "github_unavailable" });
  });

  it("maps a ref answer without a sha to github_unavailable", async () => {
    const fetchMock = vi.fn<FetchLike>(async () => json({ object: {} }));

    const result = await readRepoFile(config, "a.json", fetchMock);

    expect(result).toEqual({ ok: false, error: "github_unavailable" });
  });

  it("encodes each path segment", async () => {
    const fetchMock = fakeGitHub();

    await readRepoFile(config, "public/fotos nuevas/a#b.jpg", fetchMock);

    expect(String(fetchMock.mock.calls[1][0])).toContain(
      "/contents/public/fotos%20nuevas/a%23b.jpg?",
    );
  });
});

describe("readGitHubConfig", () => {
  it("reads repository, branch and token", () => {
    expect(
      readGitHubConfig({
        GITHUB_REPOSITORY: "ouracademy/living-langs-peru",
        GITHUB_BRANCH: "preview",
        GITHUB_TOKEN: "t",
      }),
    ).toEqual({
      repository: "ouracademy/living-langs-peru",
      branch: "preview",
      token: "t",
    });
  });

  it("defaults the branch to main and allows no token", () => {
    expect(
      readGitHubConfig({ GITHUB_REPOSITORY: "ouracademy/living-langs-peru" }),
    ).toEqual({
      repository: "ouracademy/living-langs-peru",
      branch: "main",
      token: undefined,
    });
  });

  it.each([undefined, "", "solo-nombre", "a/b/c", "../x"])(
    "rejects the repository %s",
    (repository) => {
      expect(readGitHubConfig({ GITHUB_REPOSITORY: repository })).toBeNull();
    },
  );

  it("rejects a branch with characters outside a plain ref name", () => {
    expect(
      readGitHubConfig({
        GITHUB_REPOSITORY: "ouracademy/living-langs-peru",
        GITHUB_BRANCH: "main?x=1",
      }),
    ).toBeNull();
  });
});
