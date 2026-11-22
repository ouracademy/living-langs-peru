import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { testBundle } from "../language-bundles/fixtures";
import {
  fakePackClient,
  type Answer,
  type Asked,
} from "../language-packs/fake-pack-client";

vi.mock("server-only", () => ({}));

const revalidateTag = vi.fn();
const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({
  revalidateTag,
  revalidatePath,
  unstable_cache: (fn: () => unknown) => fn,
}));

let client: SupabaseClient;
vi.mock("@/lib/supabase-admin", () => ({ getSupabaseAdmin: () => client }));

const current = await import("@/app/api/admin/lenguas/[lengua]/route");
const publish = await import("@/app/api/admin/lenguas/[lengua]/publicar/route");
const versions =
  await import("@/app/api/admin/lenguas/[lengua]/versiones/route");
const version =
  await import("@/app/api/admin/lenguas/[lengua]/versiones/[version]/route");
const restore =
  await import("@/app/api/admin/lenguas/[lengua]/restaurar/route");

const AUTH = `Basic ${Buffer.from("editora:clave-de-prueba").toString("base64")}`;
const ROW = {
  version: 2,
  bundle: testBundle(),
  note: "Revisado por PRUEBA",
  published_at: "2026-11-22T10:00:00+00:00",
};

function request(body?: unknown, authorization: string | null = AUTH) {
  return new Request("http://localhost/api/admin/lenguas/uro", {
    method: body === undefined ? "GET" : "POST",
    headers: {
      ...(authorization ? { authorization } : {}),
      "content-type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

const params = (lengua: string) => ({ params: Promise.resolve({ lengua }) });
const versionParams = (lengua: string, value: string) => ({
  params: Promise.resolve({ lengua, version: value }),
});

function useClient(handlers: {
  from?: (asked: Asked) => Answer;
  rpc?: () => Answer;
}) {
  const fake = fakePackClient(handlers);
  client = fake.client;
  return fake;
}

const goodBody = {
  bundle: testBundle(),
  expectedVersion: 2,
  note: "Revisado por PRUEBA",
};

beforeEach(() => {
  vi.stubEnv("ADMIN_USER", "editora");
  vi.stubEnv("ADMIN_PASSWORD", "clave-de-prueba");
  vi.stubEnv("SUPABASE_URL", "https://proyecto.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "clave-de-prueba-no-real");
  vi.spyOn(console, "error").mockImplementation(() => {});
  useClient({});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  revalidateTag.mockClear();
  revalidatePath.mockClear();
});

describe("/api/admin/lenguas access", () => {
  it("answers 401 without credentials, on every handler, without reading", async () => {
    const fake = useClient({ from: () => ({ data: ROW, error: null }) });
    const answers = await Promise.all([
      current.GET(request(undefined, null), params("uro")),
      versions.GET(request(undefined, null), params("uro")),
      version.GET(request(undefined, null), versionParams("uro", "1")),
      publish.POST(request(goodBody, null), params("uro")),
      restore.POST(
        request({ version: 1, expectedVersion: 2 }, null),
        params("uro"),
      ),
    ]);

    expect(answers.map((answer) => answer.status)).toEqual([
      401, 401, 401, 401, 401,
    ]);
    expect(fake.queries).toHaveLength(0);
    expect(fake.calls).toHaveLength(0);
  });

  it("answers 404 for a language outside the two of the site", async () => {
    const answer = await current.GET(request(), params("klingon"));
    expect(answer.status).toBe(404);
    expect((await answer.json()).error).toBe("language_not_found");
  });

  it("answers 503 when Supabase is not configured", async () => {
    vi.stubEnv("SUPABASE_URL", "");

    const answer = await current.GET(request(), params("uro"));

    expect(answer.status).toBe(503);
    expect((await answer.json()).error).toBe("supabase_not_configured");
  });
});

describe("GET current and history", () => {
  it("returns the published bundle from language_bundles, never cached", async () => {
    const fake = useClient({ from: () => ({ data: ROW, error: null }) });

    const answer = await current.GET(request(), params("uro"));

    expect(answer.headers.get("cache-control")).toBe("no-store");
    const body = await answer.json();
    expect(body.current.version).toBe(2);
    expect(body.current.bundle.language).toBe("uro");
    expect(fake.queries[0]).toMatchObject({
      table: "language_bundles",
      filters: [["slug", "uro"]],
    });
  });

  it("answers current: null when nothing is published", async () => {
    useClient({ from: () => ({ data: null, error: null }) });

    const body = await (await current.GET(request(), params("uro"))).json();

    expect(body.current).toBeNull();
  });

  it("treats a row of the other language as a failure", async () => {
    useClient({
      from: () => ({
        data: { ...ROW, bundle: testBundle({ language: "ashaninka" }) },
        error: null,
      }),
    });

    expect((await current.GET(request(), params("uro"))).status).toBe(502);
  });

  it("lists the history newest first, without the bundles", async () => {
    const fake = useClient({
      from: () => ({
        data: [
          { version: 2, note: "dos", published_at: ROW.published_at },
          { version: 1, note: null, published_at: ROW.published_at },
        ],
        error: null,
      }),
    });

    const body = await (await versions.GET(request(), params("uro"))).json();

    expect(body.versions).toEqual([
      { version: 2, note: "dos", publishedAt: ROW.published_at },
      { version: 1, note: "", publishedAt: ROW.published_at },
    ]);
    expect(fake.queries[0]).toMatchObject({
      table: "bundle_versions",
      order: ["version", { ascending: false }],
    });
  });

  it("refuses a malformed history row", async () => {
    useClient({ from: () => ({ data: [{ version: "x" }], error: null }) });

    expect((await versions.GET(request(), params("uro"))).status).toBe(502);
  });

  it("returns one version, or 404 / 400 when it is not there or not valid", async () => {
    useClient({ from: () => ({ data: ROW, error: null }) });
    const found = await version.GET(request(), versionParams("uro", "2"));
    expect((await found.json()).bundle.language).toBe("uro");

    useClient({ from: () => ({ data: null, error: null }) });
    expect(
      (await version.GET(request(), versionParams("uro", "9"))).status,
    ).toBe(404);
    expect(
      (await version.GET(request(), versionParams("uro", "cero"))).status,
    ).toBe(400);
  });

  it("answers 502 when the database fails", async () => {
    useClient({ from: () => ({ data: null, error: { code: "x" } }) });

    expect((await current.GET(request(), params("uro"))).status).toBe(502);
    expect((await versions.GET(request(), params("uro"))).status).toBe(502);
    expect(
      (await version.GET(request(), versionParams("uro", "1"))).status,
    ).toBe(502);
  });
});

describe("POST publicar", () => {
  it("publishes, and revalidates only the language tag", async () => {
    const fake = useClient({ rpc: () => ({ data: 3, error: null }) });

    const answer = await publish.POST(request(goodBody), params("uro"));

    expect(answer.status).toBe(200);
    expect((await answer.json()).version).toBe(3);
    expect(fake.calls[0]).toMatchObject({
      name: "publish_language_bundle",
      args: { p_slug: "uro", p_expected_version: 2 },
    });
    expect(revalidateTag).toHaveBeenCalledWith("language:uro", "max");
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("refuses a bundle with errors before calling the database", async () => {
    const fake = useClient({ rpc: () => ({ data: 3, error: null }) });

    const answer = await publish.POST(
      request({ ...goodBody, bundle: testBundle({ language: "ashaninka" }) }),
      params("uro"),
    );

    expect(answer.status).toBe(400);
    expect((await answer.json()).error).toBe("bundle_has_errors");
    expect(fake.calls).toHaveLength(0);
  });

  it("answers 409 on a version conflict, 400 on a language mismatch, 502 otherwise", async () => {
    useClient({ rpc: () => ({ data: null, error: { code: "40001" } }) });
    expect((await publish.POST(request(goodBody), params("uro"))).status).toBe(
      409,
    );

    useClient({ rpc: () => ({ data: null, error: { code: "22023" } }) });
    expect((await publish.POST(request(goodBody), params("uro"))).status).toBe(
      400,
    );

    useClient({ rpc: () => ({ data: null, error: { code: "XX000" } }) });
    expect((await publish.POST(request(goodBody), params("uro"))).status).toBe(
      502,
    );

    useClient({ rpc: () => ({ data: "no", error: null }) });
    expect((await publish.POST(request(goodBody), params("uro"))).status).toBe(
      502,
    );
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});

describe("POST restaurar", () => {
  it("publishes an old version as a new one", async () => {
    const fake = useClient({
      from: () => ({ data: { ...ROW, version: 1 }, error: null }),
      rpc: () => ({ data: 3, error: null }),
    });

    const answer = await restore.POST(
      request({ version: 1, expectedVersion: 2 }),
      params("uro"),
    );

    expect(answer.status).toBe(200);
    expect(fake.calls[0].args).toMatchObject({
      p_note: "Restaurada desde la versión 1.",
      p_expected_version: 2,
    });
    expect(revalidateTag).toHaveBeenCalledWith("language:uro", "max");
  });

  it("answers 400, 404, 409 and 502 where it must", async () => {
    expect(
      (await restore.POST(request({ version: 0 }), params("uro"))).status,
    ).toBe(400);

    useClient({ from: () => ({ data: null, error: null }) });
    expect(
      (
        await restore.POST(
          request({ version: 5, expectedVersion: 2 }),
          params("uro"),
        )
      ).status,
    ).toBe(404);

    useClient({ from: () => ({ data: null, error: { code: "x" } }) });
    expect(
      (
        await restore.POST(
          request({ version: 1, expectedVersion: 2 }),
          params("uro"),
        )
      ).status,
    ).toBe(502);

    useClient({
      from: () => ({ data: ROW, error: null }),
      rpc: () => ({ data: null, error: { code: "40001" } }),
    });
    expect(
      (
        await restore.POST(
          request({ version: 2, expectedVersion: 1 }),
          params("uro"),
        )
      ).status,
    ).toBe(409);

    useClient({
      from: () => ({ data: ROW, error: null }),
      rpc: () => ({ data: null, error: { code: "XX000" } }),
    });
    expect(
      (
        await restore.POST(
          request({ version: 2, expectedVersion: 1 }),
          params("uro"),
        )
      ).status,
    ).toBe(502);
  });
});
