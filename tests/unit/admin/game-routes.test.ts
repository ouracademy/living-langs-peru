import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { testItem, testPack, testTheme } from "../language-packs/fixtures";
import {
  fakePackClient,
  type Answer,
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

const current = await import("@/app/api/admin/juego/[lengua]/route");
const publish = await import("@/app/api/admin/juego/[lengua]/publicar/route");
const versions = await import("@/app/api/admin/juego/[lengua]/versiones/route");
const version =
  await import("@/app/api/admin/juego/[lengua]/versiones/[version]/route");
const restore = await import("@/app/api/admin/juego/[lengua]/restaurar/route");

const AUTH = `Basic ${Buffer.from("editora:clave-de-prueba").toString("base64")}`;
const ROW = {
  version: 2,
  pack: testPack(),
  note: "Revisado por PRUEBA",
  published_at: "2026-11-18T10:00:00+00:00",
};

function request(body?: unknown, authorization: string | null = AUTH) {
  return new Request("http://localhost/api/admin/juego/ashaninka", {
    method: body === undefined ? "GET" : "POST",
    headers: {
      ...(authorization ? { authorization } : {}),
      "content-type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

const params = (lengua: string) => ({ params: Promise.resolve({ lengua }) });
const versionParams = (lengua: string, version: string) => ({
  params: Promise.resolve({ lengua, version }),
});

function useClient(handlers: { from?: () => Answer; rpc?: () => Answer }) {
  const fake = fakePackClient(handlers);
  client = fake.client;
  return fake;
}

const goodBody = {
  pack: testPack(),
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

describe("/api/admin/juego access", () => {
  // AC-SP5-8, AC-SP5-9: every handler checks the password itself.
  it("answers 401 without credentials, on every handler, without reading", async () => {
    const fake = useClient({ from: () => ({ data: ROW, error: null }) });
    const answers = await Promise.all([
      current.GET(request(undefined, null), params("ashaninka")),
      versions.GET(request(undefined, null), params("ashaninka")),
      version.GET(request(undefined, null), versionParams("ashaninka", "1")),
      publish.POST(request(goodBody, null), params("ashaninka")),
      restore.POST(
        request({ version: 1, expectedVersion: 2 }, null),
        params("ashaninka"),
      ),
    ]);

    expect(answers.map((answer) => answer.status)).toEqual([
      401, 401, 401, 401, 401,
    ]);
    expect(fake.queries).toHaveLength(0);
    expect(fake.calls).toHaveLength(0);
  });

  it("answers 404 for an unknown language and 400 for one without a pack", async () => {
    expect((await current.GET(request(), params("klingon"))).status).toBe(404);
    const uro = await current.GET(request(), params("uro"));
    expect(uro.status).toBe(400);
    expect((await uro.json()).error).toBe("language_without_pack");
  });

  it("answers 503 when Supabase is not configured", async () => {
    vi.stubEnv("SUPABASE_URL", "");

    const answer = await current.GET(request(), params("ashaninka"));

    expect(answer.status).toBe(503);
    expect((await answer.json()).error).toBe("supabase_not_configured");
  });
});

describe("GET current and history", () => {
  it("returns the published pack, never cached", async () => {
    useClient({ from: () => ({ data: ROW, error: null }) });

    const answer = await current.GET(request(), params("ashaninka"));

    expect(answer.headers.get("cache-control")).toBe("no-store");
    expect((await answer.json()).current.version).toBe(2);
  });

  it("answers 502 when the database fails", async () => {
    useClient({ from: () => ({ data: null, error: { code: "x" } }) });

    expect((await current.GET(request(), params("ashaninka"))).status).toBe(
      502,
    );
    expect((await versions.GET(request(), params("ashaninka"))).status).toBe(
      502,
    );
    expect(
      (await version.GET(request(), versionParams("ashaninka", "1"))).status,
    ).toBe(502);
  });

  // AC-SP6-9
  it("lists the versions and returns one with its pack", async () => {
    useClient({
      from: () => ({
        data: [
          { version: 1, note: "uno", published_at: "2026-11-17T00:00:00Z" },
        ],
        error: null,
      }),
    });
    const list = await versions.GET(request(), params("ashaninka"));
    expect((await list.json()).versions).toHaveLength(1);

    useClient({ from: () => ({ data: ROW, error: null }) });
    const one = await version.GET(request(), versionParams("ashaninka", "2"));
    expect((await one.json()).pack.language.slug).toBe("ashaninka");
  });

  it("refuses a version that is not a number, and says when it does not exist", async () => {
    expect(
      (await version.GET(request(), versionParams("ashaninka", "dos"))).status,
    ).toBe(400);

    useClient({ from: () => ({ data: null, error: null }) });
    expect(
      (await version.GET(request(), versionParams("ashaninka", "9"))).status,
    ).toBe(404);
  });
});

describe("POST publicar", () => {
  // AC-SP6-11: only revalidateTag "max", never revalidatePath (spec §6.4).
  it("publishes and marks the public page stale, without discarding it", async () => {
    const fake = useClient({ rpc: () => ({ data: 3, error: null }) });

    const answer = await publish.POST(request(goodBody), params("ashaninka"));

    expect(answer.status).toBe(200);
    expect((await answer.json()).version).toBe(3);
    expect(fake.calls[0].args).toMatchObject({
      p_language: "ashaninka",
      p_expected_version: 2,
      p_note: "Revisado por PRUEBA",
    });
    expect(revalidateTag).toHaveBeenCalledWith(
      "word-jump-pack:ashaninka",
      "max",
    );
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  // AC-SP6-6
  it("refuses a pack with errors even if the browser sends it", async () => {
    const fake = useClient({ rpc: () => ({ data: 3, error: null }) });
    const pack = testPack({
      themes: [
        testTheme({
          items: [
            testItem({ sourceId: "no-existe" }),
            ...testTheme().items.slice(1),
          ],
        }),
      ],
    });

    const answer = await publish.POST(
      request({ ...goodBody, pack }),
      params("ashaninka"),
    );

    expect(answer.status).toBe(400);
    const body = await answer.json();
    expect(body.error).toBe("pack_has_errors");
    expect(body.issues.length).toBeGreaterThan(0);
    expect(fake.calls).toHaveLength(0);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  // AC-SP6-12
  it("refuses publishing without a note", async () => {
    const answer = await publish.POST(
      request({ ...goodBody, note: "" }),
      params("ashaninka"),
    );

    expect((await answer.json()).error).toBe("note_required");
  });

  it("refuses a pack that does not parse, with its problems", async () => {
    const answer = await publish.POST(
      request({ ...goodBody, pack: { schema: "otra" } }),
      params("ashaninka"),
    );

    const body = await answer.json();
    expect(body.error).toBe("pack_invalid");
    expect(body.problems.length).toBeGreaterThan(0);
  });

  // AC-SP6-7
  it("answers 409 on a version conflict, and 502 when the database fails", async () => {
    useClient({ rpc: () => ({ data: null, error: { code: "40001" } }) });
    const conflict = await publish.POST(request(goodBody), params("ashaninka"));
    expect(conflict.status).toBe(409);
    expect((await conflict.json()).error).toBe("version_conflict");

    useClient({ rpc: () => ({ data: null, error: { code: "08006" } }) });
    expect(
      (await publish.POST(request(goodBody), params("ashaninka"))).status,
    ).toBe(502);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("refuses a body that is not JSON", async () => {
    const answer = await publish.POST(
      new Request("http://localhost/x", {
        method: "POST",
        headers: { authorization: AUTH },
        body: "no es json",
      }),
      params("ashaninka"),
    );

    expect((await answer.json()).error).toBe("invalid_request");
  });
});

describe("POST restaurar", () => {
  // AC-SP6-9: restoring publishes the old pack as a new version.
  it("publishes the old version as a new one, with a note", async () => {
    const fake = useClient({
      from: () => ({ data: { ...ROW, version: 1 }, error: null }),
      rpc: () => ({ data: 4, error: null }),
    });

    const answer = await restore.POST(
      request({ version: 1, expectedVersion: 3 }),
      params("ashaninka"),
    );

    expect((await answer.json()).version).toBe(4);
    expect(fake.calls[0].args).toMatchObject({
      p_pack: testPack(),
      p_expected_version: 3,
      p_note: "Restaurada desde la versión 1.",
    });
    expect(revalidateTag).toHaveBeenCalledWith(
      "word-jump-pack:ashaninka",
      "max",
    );
  });

  it("answers 404 for a missing version, 409 on conflict, 400 on a bad body", async () => {
    useClient({ from: () => ({ data: null, error: null }) });
    expect(
      (
        await restore.POST(
          request({ version: 7, expectedVersion: 3 }),
          params("ashaninka"),
        )
      ).status,
    ).toBe(404);

    useClient({
      from: () => ({ data: ROW, error: null }),
      rpc: () => ({ data: null, error: { code: "40001" } }),
    });
    expect(
      (
        await restore.POST(
          request({ version: 2, expectedVersion: 1 }),
          params("ashaninka"),
        )
      ).status,
    ).toBe(409);

    expect(
      (await restore.POST(request({ version: "uno" }), params("ashaninka")))
        .status,
    ).toBe(400);
  });

  it("answers 502 when reading or publishing fails", async () => {
    useClient({ from: () => ({ data: null, error: { code: "x" } }) });
    expect(
      (
        await restore.POST(
          request({ version: 1, expectedVersion: 2 }),
          params("ashaninka"),
        )
      ).status,
    ).toBe(502);

    useClient({
      from: () => ({ data: ROW, error: null }),
      rpc: () => ({ data: null, error: { code: "08006" } }),
    });
    expect(
      (
        await restore.POST(
          request({ version: 2, expectedVersion: 2 }),
          params("ashaninka"),
        )
      ).status,
    ).toBe(502);
  });
});
