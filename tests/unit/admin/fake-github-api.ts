import { readFileSync } from "node:fs";
import { join } from "node:path";

import { vi } from "vitest";

/**
 * A fake GitHub REST API for the save tests: answers the two reads and the
 * Git Data API writes, and records every call so a test can assert on the
 * single commit a save makes.
 */

export const BASE = "a".repeat(40);
export const BASE_TREE = "b".repeat(40);
export const NEW_TREE = "c".repeat(40);
export const NEW_COMMIT = "d".repeat(40);
export const TOKEN = "token-de-prueba";

// Git stores LF; a Windows checkout may have CRLF on disk.
export const gallery = readFileSync(
  join(process.cwd(), "src/data/peoples/ashaninka.json"),
  "utf8",
).replace(/\r\n/g, "\n");

export const credentials = `Basic ${Buffer.from("editora:clave-de-prueba").toString("base64")}`;

export type Call = {
  method: string;
  url: string;
  body: Record<string, unknown>;
};

export function fakeGitHub({
  head = BASE,
  file = gallery,
  refStatus = 200,
}: { head?: string; file?: string; refStatus?: number } = {}) {
  const calls: Call[] = [];
  let blobs = 0;
  const fetchMock = vi.fn(
    async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      const body = typeof init?.body === "string" ? JSON.parse(init.body) : {};
      calls.push({ method, url, body });
      const json = (data: unknown, status = 200) =>
        Response.json(data, { status });

      if (method === "GET" && url.includes("/git/ref/heads/")) {
        return json({ object: { sha: head } });
      }
      if (method === "GET" && url.includes("/contents/")) {
        return new Response(file);
      }
      if (method === "POST" && url.endsWith("/git/blobs")) {
        blobs += 1;
        return json({ sha: String(blobs).padStart(40, "e") }, 201);
      }
      if (method === "GET" && url.endsWith(`/git/commits/${BASE}`)) {
        return json({ tree: { sha: BASE_TREE } });
      }
      if (method === "POST" && url.endsWith("/git/trees")) {
        return json({ sha: NEW_TREE }, 201);
      }
      if (method === "POST" && url.endsWith("/git/commits")) {
        return json({ sha: NEW_COMMIT }, 201);
      }
      if (method === "PATCH") {
        return refStatus === 200
          ? json({ object: { sha: NEW_COMMIT } })
          : json({ message: "Update is not a fast forward" }, refStatus);
      }
      return json({ message: "Not Found" }, 404);
    },
  );
  return { fetchMock, calls };
}

export function decodeBlob(call: Call): Buffer {
  return Buffer.from(String(call.body.content), "base64");
}

/** Env for a configured admin area; call inside beforeEach. */
export function stubAdminEnv(): void {
  vi.stubEnv("ADMIN_USER", "editora");
  vi.stubEnv("ADMIN_PASSWORD", "clave-de-prueba");
  vi.stubEnv("GITHUB_REPOSITORY", "ouracademy/living-langs-peru");
  vi.stubEnv("GITHUB_BRANCH", "main");
  vi.stubEnv("GITHUB_TOKEN", TOKEN);
}
