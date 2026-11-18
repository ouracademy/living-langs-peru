import { describe, expect, it } from "vitest";

import { resolveGameState } from "@/lib/word-jump/game-state";

import { testItem, testPack, testTheme } from "../language-packs/fixtures";

function ok(pack = testPack()) {
  return {
    status: "ok" as const,
    pack,
    version: 2,
    publishedAt: "2026-11-18T10:00:00+00:00",
  };
}

describe("resolveGameState", () => {
  // AC-SP4-8
  it("says unavailable without configuration", () => {
    expect(resolveGameState({ status: "unconfigured" })).toEqual({
      kind: "unavailable",
    });
  });

  it("says empty when nothing is published", () => {
    expect(resolveGameState({ status: "none" })).toEqual({ kind: "empty" });
  });

  it("says empty when the published pack has no playable theme", () => {
    const pack = testPack({
      themes: [
        testTheme({
          items: testTheme().items.map((item) => ({
            ...item,
            verified: false,
          })),
        }),
      ],
    });

    expect(resolveGameState(ok(pack))).toEqual({ kind: "empty" });
  });

  // AC-SP4-3: what reaches the page has already been through playableThemes.
  it("hands the page only playable themes and verified items", () => {
    const base = testTheme();
    const pack = testPack({
      themes: [
        testTheme({
          items: [
            ...base.items,
            testItem({ id: "oculto", word: "PRUEBA oculta", verified: false }),
          ],
        }),
        testTheme({ id: "pendiente", mode: "word2pic" }),
      ],
    });

    const state = resolveGameState(ok(pack));

    expect(state.kind).toBe("ready");
    if (state.kind !== "ready") return;
    expect(state.pack.themes.map((theme) => theme.id)).toEqual(["tema-prueba"]);
    expect(JSON.stringify(state.pack)).not.toContain("oculto");
    expect(state.pack.version).toBe(2);
  });

  it("keeps only the sources the playable items cite", () => {
    const pack = testPack({
      sources: [
        { id: "fuente-prueba", kind: "publication", title: "Fuente de prueba" },
        { id: "sin-uso", kind: "speaker", title: "No citada" },
      ],
    });

    const state = resolveGameState(ok(pack));

    expect(state.kind === "ready" && state.pack.sources).toEqual([
      { id: "fuente-prueba", kind: "publication", title: "Fuente de prueba" },
    ]);
  });
});
