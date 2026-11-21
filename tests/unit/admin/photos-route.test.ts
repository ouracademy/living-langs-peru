import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  credentials,
  fakeGallerySupabase,
  repoPhotos,
  SECRET_KEY,
  stubAdminEnv,
} from "./fake-gallery-supabase";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  unstable_cache: (fn: () => unknown) => fn,
}));

let supabase: ReturnType<typeof fakeGallerySupabase>["client"] | null = null;
vi.mock("@/lib/supabase-optional", () => ({
  getOptionalSupabase: () => supabase,
}));

const { GET } = await import("@/app/api/admin/fotos/route");

const get = (authorization?: string) =>
  GET(
    new Request("http://localhost/api/admin/fotos", {
      headers: authorization ? { authorization } : {},
    }),
  );

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  stubAdminEnv(vi);
  supabase = null;
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  consoleError.mockRestore();
});

describe("GET /api/admin/fotos", () => {
  // AC-E1-3: called directly, without the proxy in front.
  it("answers 401 without credentials and never reads Supabase", async () => {
    const fake = fakeGallerySupabase();
    supabase = fake.client;

    const response = await get();

    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toContain("Basic");
    expect(fake.reads).toHaveLength(0);
  });

  // AC-E1-3
  it("answers 401 with a wrong password", async () => {
    supabase = fakeGallerySupabase().client;

    const wrong = `Basic ${Buffer.from("editora:otra").toString("base64")}`;
    expect((await get(wrong)).status).toBe(401);
  });

  // AC-E1-2
  it("answers 503 when the editing credentials are not configured", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "");
    supabase = fakeGallerySupabase().client;

    expect((await get(credentials)).status).toBe(503);
  });

  // AC-E2-1: before the first save, the repo's photos at version 0.
  it("returns the repo's photos at version 0 when there is no row yet", async () => {
    const fake = fakeGallerySupabase();
    supabase = fake.client;

    const response = await get(credentials);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body).toEqual({ photos: repoPhotos, version: 0 });
    expect(fake.reads[0]).toEqual({
      table: "galleries",
      filters: [["slug", "ashaninka"]],
    });
  });

  // AC-E2-1
  it("returns the stored photos, in order, with their version", async () => {
    const stored = [repoPhotos[2], repoPhotos[0]];
    supabase = fakeGallerySupabase({
      row: { version: 7, photos: stored },
    }).client;

    const body = await (await get(credentials)).json();

    expect(body).toEqual({ photos: stored, version: 7 });
  });

  // AC-E2-2
  it("answers 503 with a Spanish message when Supabase is not configured", async () => {
    const response = await get(credentials);

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error).toBe("supabase_not_configured");
    expect(body.message).toContain("falta configurar Supabase");
  });

  // AC-E2-2
  it("answers 502 without leaking Supabase's message when the read fails", async () => {
    supabase = fakeGallerySupabase({
      readError: { code: "42501", message: "permission denied for galleries" },
    }).client;

    const response = await get(credentials);
    const text = await response.text();

    expect(response.status).toBe(502);
    expect(JSON.parse(text)).toEqual({
      error: "gallery_unavailable",
      message: "No pudimos leer la galería. Intenta de nuevo en unos minutos.",
    });
    expect(text).not.toContain("permission denied");
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(SECRET_KEY);
  });

  // AC-E2-2
  it("answers 502 when the row is malformed", async () => {
    supabase = fakeGallerySupabase({
      row: { version: 1, photos: [{ src: "x" }] },
    }).client;

    const response = await get(credentials);

    expect(response.status).toBe(502);
    expect((await response.json()).error).toBe("gallery_unavailable");
  });
});
