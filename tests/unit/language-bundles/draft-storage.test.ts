import { describe, expect, it } from "vitest";

import {
  type BundleDraftStorage,
  bundleDraftFromText,
  bundleDraftKey,
  clearBundleDraft,
  readBundleDraftText,
  writeBundleDraft,
} from "@/lib/language-bundles/draft-storage";

import { testBundle } from "./fixtures";

function memoryStorage(): BundleDraftStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

const refusing: BundleDraftStorage = {
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

describe("bundle draft storage", () => {
  it("keeps one copy per language and reads it back", () => {
    const storage = memoryStorage();
    expect(writeBundleDraft(storage, "uro", testBundle())).toBe(true);

    expect(storage.data.has(bundleDraftKey("uro"))).toBe(true);
    const text = readBundleDraftText(storage, "uro");
    expect(bundleDraftFromText(text)).toEqual(testBundle());
    expect(readBundleDraftText(storage, "ashaninka")).toBeNull();
  });

  it("forgets the copy on discard", () => {
    const storage = memoryStorage();
    writeBundleDraft(storage, "uro", testBundle());

    expect(clearBundleDraft(storage, "uro")).toBe(true);
    expect(readBundleDraftText(storage, "uro")).toBeNull();
  });

  it("ignores a saved text that is not a bundle", () => {
    expect(bundleDraftFromText(null)).toBeNull();
    expect(bundleDraftFromText("{ roto")).toBeNull();
    expect(bundleDraftFromText(JSON.stringify({ schema: "otra" }))).toBeNull();
  });

  it("never throws when the browser refuses or has no storage", () => {
    expect(readBundleDraftText(refusing, "uro")).toBeNull();
    expect(writeBundleDraft(refusing, "uro", testBundle())).toBe(false);
    expect(clearBundleDraft(refusing, "uro")).toBe(false);
    expect(writeBundleDraft(null, "uro", testBundle())).toBe(false);
    expect(clearBundleDraft(null, "uro")).toBe(true);
    expect(readBundleDraftText(null, "uro")).toBeNull();
  });
});
