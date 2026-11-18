import { describe, expect, it, vi } from "vitest";

import {
  commitFiles,
  type FetchLike,
  readGitHubConfig,
  readRepoFile,
  readRepoFileAt,
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

describe("readGitHubConfig with GITHUB_API_URL", () => {
  // Only the e2e suite points this at a local fake; production leaves it unset.
  it("uses an alternative API base when it is a valid http(s) URL", () => {
    expect(
      readGitHubConfig({
        GITHUB_REPOSITORY: "ouracademy/living-langs-peru",
        GITHUB_API_URL: "http://127.0.0.1:3901/",
      })?.apiUrl,
    ).toBe("http://127.0.0.1:3901");
  });

  it.each(["ftp://x", "no es una url"])("rejects the API base %s", (value) => {
    expect(
      readGitHubConfig({
        GITHUB_REPOSITORY: "ouracademy/living-langs-peru",
        GITHUB_API_URL: value,
      }),
    ).toBeNull();
  });

  it("sends reads to that base", async () => {
    const fetchMock = fakeGitHub();
    await readRepoFile(
      { ...config, apiUrl: "http://127.0.0.1:3901" },
      "a.json",
      fetchMock,
    );
    expect(String(fetchMock.mock.calls[0][0])).toMatch(
      /^http:\/\/127\.0\.0\.1:3901\/repos\//,
    );
  });
});

describe("readRepoFileAt", () => {
  it("reads at the given commit without resolving the branch", async () => {
    const fetchMock = fakeGitHub('{"photos": []}\n');

    const result = await readRepoFileAt(
      config,
      "src/data/peoples/ashaninka.json",
      COMMIT_SHA,
      fetchMock,
    );

    expect(result).toEqual({ ok: true, value: '{"photos": []}\n' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain(`?ref=${COMMIT_SHA}`);
  });
});

describe("commitFiles", () => {
  const BASE = "1".repeat(40);
  const BASE_TREE = "2".repeat(40);
  const NEW_TREE = "3".repeat(40);
  const NEW_COMMIT = "4".repeat(40);

  type Call = { method: string; url: string; body: Record<string, unknown> };

  /** A fake Git Data API that records every write it receives. */
  function fakeWrites(refStatus = 200) {
    const calls: Call[] = [];
    let blob = 0;
    const fetchMock = vi.fn<FetchLike>(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      const body = typeof init?.body === "string" ? JSON.parse(init.body) : {};
      calls.push({ method, url, body });

      if (method === "POST" && url.endsWith("/git/blobs")) {
        blob += 1;
        return json({ sha: String(blob).padStart(40, "b") }, 201);
      }
      if (method === "GET" && url.endsWith(`/git/commits/${BASE}`)) {
        return json({ sha: BASE, tree: { sha: BASE_TREE } });
      }
      if (method === "POST" && url.endsWith("/git/trees")) {
        return json({ sha: NEW_TREE }, 201);
      }
      if (method === "POST" && url.endsWith("/git/commits")) {
        return json({ sha: NEW_COMMIT }, 201);
      }
      if (method === "PATCH" && url.endsWith("/git/refs/heads/main")) {
        return refStatus === 200
          ? json({ object: { sha: NEW_COMMIT } })
          : json({ message: "Update is not a fast forward" }, refStatus);
      }
      return json({ message: "Not Found" }, 404);
    });
    return { fetchMock, calls };
  }

  const request = {
    baseSha: BASE,
    files: [
      {
        path: "public/peoples/ashaninka/2026-11-18-abc123.jpg",
        content: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]),
      },
      { path: "src/data/peoples/ashaninka.json", content: '{"a": 1}\n' },
    ],
    message: "chore: update ashaninka gallery (add photo)",
  };

  // AC-E3-1: image and JSON in a single commit on top of the sha read.
  it("creates one commit with every file, on top of the base commit", async () => {
    const { fetchMock, calls } = fakeWrites();

    const result = await commitFiles(config, request, fetchMock);

    expect(result).toEqual({ ok: true, value: NEW_COMMIT });

    const blobs = calls.filter((call) => call.url.endsWith("/git/blobs"));
    expect(blobs.map((call) => call.body)).toEqual([
      { content: "/9j/2Q==", encoding: "base64" },
      {
        content: Buffer.from('{"a": 1}\n').toString("base64"),
        encoding: "base64",
      },
    ]);

    const tree = calls.find((call) => call.url.endsWith("/git/trees"));
    expect(tree?.body).toEqual({
      base_tree: BASE_TREE,
      tree: [
        {
          path: "public/peoples/ashaninka/2026-11-18-abc123.jpg",
          mode: "100644",
          type: "blob",
          sha: "1".padStart(40, "b"),
        },
        {
          path: "src/data/peoples/ashaninka.json",
          mode: "100644",
          type: "blob",
          sha: "2".padStart(40, "b"),
        },
      ],
    });

    const commit = calls.find(
      (call) => call.method === "POST" && call.url.endsWith("/git/commits"),
    );
    expect(commit?.body).toEqual({
      message: request.message,
      tree: NEW_TREE,
      parents: [BASE],
    });

    const ref = calls.find((call) => call.method === "PATCH");
    expect(ref?.body).toEqual({ sha: NEW_COMMIT, force: false });
    expect(calls.filter((call) => call.method === "PATCH")).toHaveLength(1);
  });

  it("removes deleted paths in the same tree", async () => {
    const { fetchMock, calls } = fakeWrites();

    await commitFiles(
      config,
      { ...request, deletions: ["public/peoples/ashaninka/vieja.jpg"] },
      fetchMock,
    );

    const tree = calls.find((call) => call.url.endsWith("/git/trees"));
    expect((tree?.body.tree as unknown[]).at(-1)).toEqual({
      path: "public/peoples/ashaninka/vieja.jpg",
      mode: "100644",
      type: "blob",
      sha: null,
    });
  });

  // AC-E3-5: someone pushed in between, GitHub refuses the fast forward.
  it("maps a refused fast forward to version_conflict", async () => {
    const { fetchMock } = fakeWrites(422);

    expect(await commitFiles(config, request, fetchMock)).toEqual({
      ok: false,
      error: "version_conflict",
    });
  });

  it("never writes without a token", async () => {
    const { fetchMock } = fakeWrites();

    expect(
      await commitFiles({ ...config, token: undefined }, request, fetchMock),
    ).toEqual({ ok: false, error: "github_unauthorized" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("stops at the first failed step and never moves the branch", async () => {
    const fetchMock = vi.fn<FetchLike>(async () =>
      json({ message: "Bad credentials" }, 401),
    );

    expect(await commitFiles(config, request, fetchMock)).toEqual({
      ok: false,
      error: "github_unauthorized",
    });
    expect(
      fetchMock.mock.calls.some(([, init]) => init?.method === "PATCH"),
    ).toBe(false);
  });

  it("maps an answer without a sha to github_unavailable", async () => {
    const fetchMock = vi.fn<FetchLike>(async () => json({}, 201));

    expect(await commitFiles(config, request, fetchMock)).toEqual({
      ok: false,
      error: "github_unavailable",
    });
  });
});
