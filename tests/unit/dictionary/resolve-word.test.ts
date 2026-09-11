import { describe, expect, it } from "vitest";

import { resolveWord } from "@/lib/dictionary";

import { entries } from "./fixtures";

describe("resolveWord", () => {
  // AC-M1-8
  it("resolves by exact id", () => {
    expect(resolveWord(entries, "naaka")?.word).toBe("ñaaka");
  });

  it("resolves by the raw word, ignoring case and diacritics", () => {
    expect(resolveWord(entries, "ñaaka")?.id).toBe("naaka");
    expect(resolveWord(entries, "ÑAAKA")?.id).toBe("naaka");
    expect(resolveWord(entries, "peru")?.id).toBe("peru");
    expect(resolveWord(entries, "PERÚ")?.id).toBe("peru");
  });

  it("resolves by a variant spelling", () => {
    expect(resolveWord(entries, "kiya")?.id).toBe("kija");
  });

  it("prefers an id match over a word match", () => {
    const ambiguous = [
      { id: "uno", word: "dos", translations: ["a"], examples: [] },
      { id: "tres", word: "uno", translations: ["b"], examples: [] },
    ];

    expect(resolveWord(ambiguous, "uno")?.id).toBe("uno");
  });

  it("returns undefined for a value that matches nothing", () => {
    expect(resolveWord(entries, "basura")).toBeUndefined();
  });

  it("returns undefined for an empty value", () => {
    expect(resolveWord(entries, "")).toBeUndefined();
    expect(resolveWord(entries, "   ")).toBeUndefined();
  });
});
