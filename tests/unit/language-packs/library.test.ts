import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { testPack } from "./fixtures";

// "server-only" throws outside a server bundle, which is exactly what jsdom is.
vi.mock("server-only", () => ({}));

// unstable_cache needs Next's incremental cache; here it only has to show what
// it was called with and run the function.
const cacheCalls: { keyParts: string[]; options: unknown }[] = [];
vi.mock("next/cache", () => ({
  unstable_cache:
    (fn: () => Promise<unknown>, keyParts: string[], options: unknown) =>
    () => {
      cacheCalls.push({ keyParts, options });
      return fn();
    },
}));

const { readPublishedPack, getPublishedPack, getPackClient, packTag } =
  await import("@/lib/language-packs/library");

type Row = { version: unknown; pack: unknown; published_at: unknown } | null;

/** A client whose single query answers with `answer`, recording what was asked. */
function clientAnswering(answer: { data: Row; error: unknown }) {
  const asked: Record<string, unknown> = {};
  const query = {
    select(columns: string) {
      asked.columns = columns;
      return query;
    },
    eq(column: string, value: string) {
      asked.filter = [column, value];
      return query;
    },
    maybeSingle: async () => answer,
  };
  const client = {
    from(table: string) {
      asked.table = table;
      return query;
    },
  } as unknown as SupabaseClient;
  return { client, asked };
}

const ROW = {
  version: 3,
  pack: testPack(),
  published_at: "2026-11-18T10:00:00+00:00",
};

beforeEach(() => {
  cacheCalls.length = 0;
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("readPublishedPack", () => {
  // AC-SP3-8
  it("is unconfigured, without throwing, when there is no client", async () => {
    await expect(readPublishedPack("ashaninka", null)).resolves.toEqual({
      status: "unconfigured",
    });
  });

  it("reads the published row of that language", async () => {
    const { client, asked } = clientAnswering({ data: ROW, error: null });

    const result = await readPublishedPack("ashaninka", client);

    expect(asked).toEqual({
      table: "language_packs",
      columns: "version, pack, published_at",
      filter: ["language", "ashaninka"],
    });
    expect(result).toEqual({
      status: "ok",
      pack: testPack(),
      version: 3,
      publishedAt: "2026-11-18T10:00:00+00:00",
    });
  });

  it("is none when the language has no published pack", async () => {
    const { client } = clientAnswering({ data: null, error: null });

    await expect(readPublishedPack("ashaninka", client)).resolves.toEqual({
      status: "none",
    });
  });

  // AC-SP3-11 / decision #8: an error throws, it never becomes «none».
  it("throws when Supabase answers with an error", async () => {
    const { client } = clientAnswering({
      data: null,
      error: { code: "PGRST301", message: "boom" },
    });

    await expect(readPublishedPack("ashaninka", client)).rejects.toThrow(
      "PGRST301",
    );
  });

  // AC-SP3-7
  it("throws on a malformed pack instead of returning half of it", async () => {
    const { client } = clientAnswering({
      data: { ...ROW, pack: { schema: "otra-cosa" } },
      error: null,
    });

    await expect(readPublishedPack("ashaninka", client)).rejects.toThrow(
      "malformed",
    );
  });

  // AC-SP3-7
  it("throws on a row without a usable version", async () => {
    const { client } = clientAnswering({
      data: { ...ROW, version: "3" },
      error: null,
    });

    await expect(readPublishedPack("ashaninka", client)).rejects.toThrow(
      "malformed",
    );
  });

  it("throws when the row holds another language's pack", async () => {
    const { client } = clientAnswering({ data: ROW, error: null });

    await expect(readPublishedPack("uro", client)).rejects.toThrow("language");
  });
});

describe("getPackClient", () => {
  it.each([
    ["", ""],
    ["https://example.supabase.co", ""],
    ["", "service-role-key"],
  ])("is null without both variables (%j, %j)", (url, key) => {
    vi.stubEnv("SUPABASE_URL", url);
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", key);

    expect(getPackClient()).toBeNull();
  });

  it("returns the server client when both are set", () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");

    expect(getPackClient()).not.toBeNull();
  });
});

describe("getPublishedPack", () => {
  it("caches per language, tagged for publishing, revalidated hourly", async () => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    await expect(getPublishedPack("ashaninka")).resolves.toEqual({
      status: "unconfigured",
    });
    expect(cacheCalls).toEqual([
      {
        keyParts: ["word-jump-pack", "ashaninka"],
        options: { tags: [packTag("ashaninka")], revalidate: 3600 },
      },
    ]);
    expect(packTag("ashaninka")).toBe("word-jump-pack:ashaninka");
  });
});
