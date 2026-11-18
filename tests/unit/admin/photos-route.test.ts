import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/admin/fotos/route";

const COMMIT_SHA = "b".repeat(40);
const gallery = readFileSync(
  join(process.cwd(), "src/data/peoples/ashaninka.json"),
  "utf8",
);

const credentials = `Basic ${Buffer.from("editora:clave-de-prueba").toString("base64")}`;

const get = (authorization?: string) =>
  GET(
    new Request("http://localhost/api/admin/fotos", {
      headers: authorization ? { authorization } : {},
    }),
  );

function githubAnswering(file: string | Response) {
  return vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes("/git/ref/heads/")) {
      return Response.json({ object: { sha: COMMIT_SHA } });
    }
    return typeof file === "string" ? new Response(file) : file;
  });
}

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.stubEnv("ADMIN_USER", "editora");
  vi.stubEnv("ADMIN_PASSWORD", "clave-de-prueba");
  vi.stubEnv("GITHUB_REPOSITORY", "ouracademy/living-langs-peru");
  vi.stubEnv("GITHUB_BRANCH", "main");
  vi.stubEnv("GITHUB_TOKEN", "token-de-prueba");
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  consoleError.mockRestore();
});

describe("GET /api/admin/fotos", () => {
  // AC-E1-3: called directly, without the proxy in front.
  it("answers 401 without credentials and never calls GitHub", async () => {
    const fetchMock = githubAnswering(gallery);
    vi.stubGlobal("fetch", fetchMock);

    const response = await get();

    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toContain("Basic");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // AC-E1-3
  it("answers 401 with a wrong password", async () => {
    vi.stubGlobal("fetch", githubAnswering(gallery));

    const wrong = `Basic ${Buffer.from("editora:otra").toString("base64")}`;
    expect((await get(wrong)).status).toBe(401);
  });

  // AC-E1-2
  it("answers 503 when the editing credentials are not configured", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "");
    vi.stubGlobal("fetch", githubAnswering(gallery));

    expect((await get(credentials)).status).toBe(503);
  });

  // AC-E2-1
  it("returns the photos of the branch, in order, with the commit sha", async () => {
    vi.stubGlobal("fetch", githubAnswering(gallery));

    const response = await get(credentials);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body.sha).toBe(COMMIT_SHA);
    expect(body.photos).toEqual(JSON.parse(gallery).photos);
    expect(body.photos).toHaveLength(5);
  });

  // AC-E2-2
  it("answers 502 with a Spanish message when GitHub is down", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );

    const response = await get(credentials);

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: "github_unavailable",
      message: "No pudimos leer la galería. Intenta de nuevo en unos minutos.",
    });
  });

  // AC-E2-2
  it("does not leak the token or GitHub's message when the token is rejected", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ message: "Bad credentials" }, { status: 401 }),
      ),
    );

    const response = await get(credentials);
    const text = await response.text();

    expect(response.status).toBe(502);
    expect(text).toContain("github_unauthorized");
    expect(text).not.toContain("Bad credentials");
    expect(text).not.toContain("token-de-prueba");
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(
      "token-de-prueba",
    );
  });

  // AC-E2-2
  it("answers 502 when the file is not a gallery", async () => {
    vi.stubGlobal("fetch", githubAnswering("not json"));

    const response = await get(credentials);

    expect(response.status).toBe(502);
    expect((await response.json()).error).toBe("gallery_unreadable");
  });

  it("answers 503 when the repository is not configured", async () => {
    vi.stubEnv("GITHUB_REPOSITORY", "");
    const fetchMock = githubAnswering(gallery);
    vi.stubGlobal("fetch", fetchMock);

    const response = await get(credentials);

    expect(response.status).toBe(503);
    expect((await response.json()).error).toBe("github_not_configured");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
