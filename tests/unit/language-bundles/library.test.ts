import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { testBundle } from "./fixtures";

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

let client: SupabaseClient | null = null;
vi.mock("@/lib/supabase-optional", () => ({
  getOptionalSupabase: () => client,
}));

const { bundleTag, getLanguageBundle, readPublishedBundle } =
  await import("@/lib/language-bundles/library");
const { getGamePack } = await import("@/lib/language-bundles/game-pack");
const { getDictionaryContent, getLanguagesWithContent } =
  await import("@/lib/dictionary/content");

type Answer = { data: unknown; error: unknown };

/** A client whose single query answers with `answer`, recording the filter. */
function clientAnswering(answer: Answer | (() => never)) {
  const asked: Record<string, unknown> = {};
  const query = {
    select(columns: string) {
      asked.columns = columns;
      return query;
    },
    eq(column: string, value: string) {
      asked[column] = value;
      return query;
    },
    async maybeSingle() {
      if (typeof answer === "function") answer();
      return answer;
    },
  };
  return {
    asked,
    client: {
      from(table: string) {
        asked.table = table;
        return query;
      },
    } as unknown as SupabaseClient,
  };
}

const row = (bundle: unknown = testBundle(), version = 3) => ({
  data: { version, bundle, published_at: "2026-11-21T10:00:00+00:00" },
  error: null,
});

beforeEach(() => {
  cacheCalls.length = 0;
  client = null;
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

describe("readPublishedBundle", () => {
  it("reads the bundle of one slug and parses it", async () => {
    const { client: answering, asked } = clientAnswering(row());

    const result = await readPublishedBundle("uro", answering);

    expect(asked).toMatchObject({ table: "language_bundles", slug: "uro" });
    expect(result).toMatchObject({
      status: "ok",
      version: 3,
      origin: "supabase",
    });
  });

  it("answers none when nothing is published", async () => {
    const { client: answering } = clientAnswering({ data: null, error: null });
    expect(await readPublishedBundle("uro", answering)).toEqual({
      status: "none",
    });
  });

  it("throws on an error, a malformed row or another language", async () => {
    for (const answer of [
      { data: null, error: { code: "PGRST205" } },
      row({ schema: "otro" }),
      row(testBundle({ language: "ashaninka" })),
    ]) {
      await expect(
        readPublishedBundle("uro", clientAnswering(answer).client),
      ).rejects.toThrow();
    }
  });
});

describe("getLanguageBundle", () => {
  it("uses the repo's bundle without Supabase", async () => {
    const ashaninka = await getLanguageBundle("ashaninka");
    expect(ashaninka).toMatchObject({
      status: "ok",
      origin: "repo",
      version: 0,
    });
    expect(await getLanguageBundle("uro")).toEqual({ status: "none" });
  });

  it("caches the published bundle under the language's tag", async () => {
    client = clientAnswering(row()).client;

    const result = await getLanguageBundle("uro", "production");

    expect(result).toMatchObject({ status: "ok", origin: "supabase" });
    expect(cacheCalls[0]).toEqual({
      keyParts: ["language-bundle", "uro"],
      options: { tags: [bundleTag("uro")], revalidate: 3600 },
    });
    expect(bundleTag("uro")).toBe("language:uro");
  });

  it("falls back to the repo when nothing is published", async () => {
    client = clientAnswering({ data: null, error: null }).client;
    expect(await getLanguageBundle("ashaninka", "production")).toMatchObject({
      origin: "repo",
    });
  });

  // AC-L2-2: a failure falls back while building, and throws in production.
  it("falls back on a failed read during a build, and throws in production", async () => {
    client = clientAnswering({
      data: null,
      error: { code: "PGRST205" },
    }).client;

    expect(await getLanguageBundle("ashaninka", "build")).toMatchObject({
      origin: "repo",
    });
    await expect(
      getLanguageBundle("ashaninka", "production"),
    ).rejects.toThrow();
  });
});

describe("getGamePack", () => {
  it("plays a published bundle, read from language_bundles only", async () => {
    const answering = clientAnswering(row());
    client = answering.client;

    const result = await getGamePack("uro", "production");

    expect(result).toMatchObject({ status: "ok", version: 3 });
    // gestor-lenguas F4: the retired language_packs table is never read.
    expect(answering.asked.table).toBe("language_bundles");
  });

  it("then the repo's bundle, and none for a language with nothing", async () => {
    const ashaninka = await getGamePack("ashaninka", "production");
    expect(ashaninka).toMatchObject({ status: "ok", version: 0 });
    if (ashaninka.status === "ok") {
      expect(ashaninka.pack.language.name).toBe("Asháninka");
      expect(ashaninka.pack.language.isoCode).toBe("cni");
    }
    expect(await getGamePack("uro", "production")).toEqual({ status: "none" });
  });

  it("falls back to the repo on a failed read while building, but throws in production", async () => {
    client = clientAnswering({
      data: null,
      error: { code: "PGRST205" },
    }).client;

    expect(await getGamePack("ashaninka", "build")).toMatchObject({
      version: 0,
    });
    await expect(getGamePack("ashaninka", "production")).rejects.toThrow();
  });
});

describe("dictionary content", () => {
  // AC-L3-3
  it("has content for asháninka and none for uro until something is published", async () => {
    expect(
      (await getDictionaryContent("ashaninka"))?.dictionary.entries.length,
    ).toBe(169);
    expect(await getDictionaryContent("uro")).toBeNull();
    expect(await getLanguagesWithContent()).toEqual([
      { slug: "ashaninka", name: "Asháninka", total: 169 },
    ]);
  });

  it("shows uro as soon as it has a verified entry published", async () => {
    client = clientAnswering(row()).client;

    const content = await getDictionaryContent("uro");

    expect(content?.dictionary.entries.map((entry) => entry.id)).toEqual([
      "prueba-uno",
      "prueba-dos",
      "prueba-tres",
    ]);
    expect(content?.alphabet).toEqual(testBundle().alphabet.graphemes);
  });
});
