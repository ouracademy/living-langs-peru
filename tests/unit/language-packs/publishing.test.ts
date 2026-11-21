import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { testPack } from "./fixtures";
import { fakePackClient } from "./fake-pack-client";

vi.mock("server-only", () => ({}));

const {
  audioBaseUrlFrom,
  listVersions,
  publishErrorFor,
  publishPack,
  readCurrentPack,
  readVersion,
} = await import("@/lib/language-packs/publishing");

const ROW = {
  version: 2,
  pack: testPack(),
  note: "Revisado por PRUEBA",
  published_at: "2026-11-18T10:00:00+00:00",
};

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("publishErrorFor", () => {
  // AC-SP3-4, AC-SP3-5
  it("translates the codes of publish_language_pack", () => {
    expect(publishErrorFor("40001")).toBe("version_conflict");
    expect(publishErrorFor("22023")).toBe("language_mismatch");
    expect(publishErrorFor("42501")).toBe("unavailable");
    expect(publishErrorFor(undefined)).toBe("unavailable");
  });
});

describe("readCurrentPack", () => {
  it("reads the published pack with its note", async () => {
    const { client, queries } = fakePackClient({
      from: () => ({ data: ROW, error: null }),
    });

    const read = await readCurrentPack(client, "ashaninka");

    expect(read).toEqual({
      ok: true,
      value: {
        version: 2,
        note: "Revisado por PRUEBA",
        publishedAt: ROW.published_at,
        pack: testPack(),
      },
    });
    expect(queries[0]).toMatchObject({
      table: "language_packs",
      filters: [["language", "ashaninka"]],
      single: true,
    });
  });

  it("answers null when nothing is published", async () => {
    const { client } = fakePackClient({
      from: () => ({ data: null, error: null }),
    });

    expect(await readCurrentPack(client, "ashaninka")).toEqual({
      ok: true,
      value: null,
    });
  });

  it("answers unavailable on an error or a malformed row, never throws", async () => {
    const failing = fakePackClient({
      from: () => ({ data: null, error: { code: "PGRST000" } }),
    });
    const malformed = fakePackClient({
      from: () => ({ data: { ...ROW, pack: { schema: "otra" } }, error: null }),
    });
    const otherLanguage = fakePackClient({
      from: () => ({ data: ROW, error: null }),
    });

    expect(await readCurrentPack(failing.client, "ashaninka")).toEqual({
      ok: false,
      error: "unavailable",
    });
    expect((await readCurrentPack(malformed.client, "ashaninka")).ok).toBe(
      false,
    );
    expect((await readCurrentPack(otherLanguage.client, "uro")).ok).toBe(false);
  });
});

describe("listVersions", () => {
  // AC-SP6-9
  it("lists the history newest first, without the packs", async () => {
    const { client, queries } = fakePackClient({
      from: () => ({
        data: [
          { version: 2, note: "dos", published_at: "2026-11-18T10:00:00Z" },
          { version: 1, note: null, published_at: "2026-11-17T10:00:00Z" },
        ],
        error: null,
      }),
    });

    const read = await listVersions(client, "ashaninka");

    expect(read).toEqual({
      ok: true,
      value: [
        { version: 2, note: "dos", publishedAt: "2026-11-18T10:00:00Z" },
        { version: 1, note: "", publishedAt: "2026-11-17T10:00:00Z" },
      ],
    });
    expect(queries[0]).toMatchObject({
      table: "pack_versions",
      columns: "version, note, published_at",
      order: ["version", { ascending: false }],
    });
  });

  it("answers unavailable on an error or a malformed row", async () => {
    const failing = fakePackClient({
      from: () => ({ data: null, error: { code: "PGRST000" } }),
    });
    const malformed = fakePackClient({
      from: () => ({ data: [{ version: "dos" }], error: null }),
    });

    expect((await listVersions(failing.client, "ashaninka")).ok).toBe(false);
    expect((await listVersions(malformed.client, "ashaninka")).ok).toBe(false);
  });

  it("answers an empty history when there are no rows", async () => {
    const { client } = fakePackClient({
      from: () => ({ data: null, error: null }),
    });

    expect(await listVersions(client, "ashaninka")).toEqual({
      ok: true,
      value: [],
    });
  });
});

describe("readVersion", () => {
  it("reads one version by number", async () => {
    const { client, queries } = fakePackClient({
      from: () => ({ data: ROW, error: null }),
    });

    const read = await readVersion(client, "ashaninka", 2);

    expect(read.ok && read.value?.version).toBe(2);
    expect(queries[0].filters).toEqual([
      ["language", "ashaninka"],
      ["version", 2],
    ]);
  });

  it("answers null for a version that does not exist, and unavailable on errors", async () => {
    const none = fakePackClient({ from: () => ({ data: null, error: null }) });
    const failing = fakePackClient({
      from: () => ({ data: null, error: { code: "x" } }),
    });
    const malformed = fakePackClient({
      from: () => ({ data: { version: 1 }, error: null }),
    });

    expect(await readVersion(none.client, "ashaninka", 9)).toEqual({
      ok: true,
      value: null,
    });
    expect((await readVersion(failing.client, "ashaninka", 1)).ok).toBe(false);
    expect((await readVersion(malformed.client, "ashaninka", 1)).ok).toBe(
      false,
    );
  });
});

describe("publishPack", () => {
  const input = {
    language: "ashaninka",
    pack: testPack(),
    expectedVersion: 1,
    note: "Revisado por PRUEBA",
  };

  // AC-SP3-3
  it("calls publish_language_pack and returns the new version", async () => {
    const { client, calls } = fakePackClient({
      rpc: () => ({ data: 2, error: null }),
    });

    expect(await publishPack(client, input)).toEqual({ ok: true, version: 2 });
    expect(calls[0]).toEqual({
      name: "publish_language_pack",
      args: {
        p_language: "ashaninka",
        p_pack: testPack(),
        p_expected_version: 1,
        p_note: "Revisado por PRUEBA",
      },
    });
  });

  // AC-SP3-4
  it("answers version_conflict on 40001", async () => {
    const { client } = fakePackClient({
      rpc: () => ({ data: null, error: { code: "40001" } }),
    });

    expect(await publishPack(client, input)).toEqual({
      ok: false,
      error: "version_conflict",
    });
  });

  it("answers unavailable on other errors and on an answer without a version", async () => {
    const failing = fakePackClient({
      rpc: () => ({ data: null, error: { code: "08006" } }),
    });
    const odd = fakePackClient({ rpc: () => ({ data: "dos", error: null }) });

    expect(await publishPack(failing.client, input)).toEqual({
      ok: false,
      error: "unavailable",
    });
    expect(await publishPack(odd.client, input)).toEqual({
      ok: false,
      error: "unavailable",
    });
  });
});

describe("audioBaseUrlFrom", () => {
  it("builds the public audio bucket URL from SUPABASE_URL", () => {
    expect(audioBaseUrlFrom({ SUPABASE_URL: "https://p.supabase.co/" })).toBe(
      "https://p.supabase.co/storage/v1/object/public/audio/",
    );
    expect(audioBaseUrlFrom({})).toBeNull();
    expect(audioBaseUrlFrom({ SUPABASE_URL: "  " })).toBeNull();
  });
});
