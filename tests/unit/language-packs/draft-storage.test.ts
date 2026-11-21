import { describe, expect, it } from "vitest";

import {
  clearDraft,
  draftFromText,
  draftKey,
  type DraftStorage,
  readDraftText,
  writeDraft,
} from "@/lib/language-packs/draft-storage";

import { testPack } from "./fixtures";

function memoryStorage(): DraftStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

const broken: DraftStorage = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("quota");
  },
  removeItem: () => {
    throw new Error("blocked");
  },
};

describe("draft storage", () => {
  it("uses one versioned key per language (plan §3.8)", () => {
    expect(draftKey("ashaninka")).toBe("living-langs:pack-admin:v1:ashaninka");
  });

  // AC-SP6-13
  it("writes a pack and reads the same pack back", () => {
    const storage = memoryStorage();

    expect(writeDraft(storage, "ashaninka", testPack())).toBe(true);

    expect(draftFromText(readDraftText(storage, "ashaninka"))).toEqual(
      testPack(),
    );
  });

  it("forgets the pack on «Descartar»", () => {
    const storage = memoryStorage();
    writeDraft(storage, "ashaninka", testPack());

    expect(clearDraft(storage, "ashaninka")).toBe(true);

    expect(readDraftText(storage, "ashaninka")).toBeNull();
  });

  it("ignores a saved text that is not a valid pack", () => {
    expect(draftFromText("{ roto")).toBeNull();
    expect(draftFromText(JSON.stringify({ schema: "otra" }))).toBeNull();
    expect(draftFromText(null)).toBeNull();
  });

  it("says when the browser refuses, and never throws", () => {
    expect(writeDraft(broken, "ashaninka", testPack())).toBe(false);
    expect(readDraftText(broken, "ashaninka")).toBeNull();
    expect(clearDraft(broken, "ashaninka")).toBe(false);
  });

  it("treats a browser without storage as «nothing saved»", () => {
    expect(writeDraft(null, "ashaninka", testPack())).toBe(false);
    expect(readDraftText(null, "ashaninka")).toBeNull();
    expect(clearDraft(null, "ashaninka")).toBe(true);
  });
});
