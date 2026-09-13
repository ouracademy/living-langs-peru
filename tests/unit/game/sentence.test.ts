import { describe, expect, it } from "vitest";

import {
  BLANK_LABEL,
  toSentenceParts,
  toSentenceText,
} from "@/lib/game/sentence";

/** What the reader sees, blank included. */
function flatten(tokens: (string | null)[]): string {
  return toSentenceParts(tokens)
    .map((part) => (part.spaceBefore ? " " : "") + (part.token ?? "___"))
    .join("");
}

describe("toSentenceParts", () => {
  it("separates words with a single space", () => {
    expect(flatten(["Nokoi", null, "kipatsiki"])).toBe("Nokoi ___ kipatsiki");
  });

  it("never puts a space before the first word", () => {
    expect(toSentenceParts(["Nokoi", "kaniri"])[0].spaceBefore).toBe(false);
  });

  // The punctuation that sat against the blank travels as its own token, so
  // without this the sentence would come back as "ojitari ___ ?".
  it("keeps closing punctuation against the word before it", () => {
    expect(flatten(["¿Jaoka", "ojitari", null, "?"])).toBe(
      "¿Jaoka ojitari ___?",
    );
    expect(flatten(["Ora", null, ",", "te", "oijaterojiro"])).toBe(
      "Ora ___, te oijaterojiro",
    );
  });

  it("keeps opening punctuation against the word after it", () => {
    expect(flatten(["¿", null, "ojitari", "kametsa"])).toBe(
      "¿___ ojitari kametsa",
    );
  });

  it("reads back a sentence that has no blank", () => {
    expect(flatten(["¿Timatsi", "abishimotantsi?"])).toBe(
      "¿Timatsi abishimotantsi?",
    );
  });

  it("marks which part is the blank", () => {
    const parts = toSentenceParts(["Nokoi", null, "kipatsiki"]);

    expect(parts.map((part) => part.token === null)).toEqual([
      false,
      true,
      false,
    ]);
  });

  it("names the blank for screen readers", () => {
    // A long dash is not announced, so the gap needs a word.
    expect(BLANK_LABEL).toMatch(/espacio en blanco/i);
  });
});

describe("toSentenceText", () => {
  it("puts the answer in the gap", () => {
    expect(
      toSentenceText(["Nokoi", null, "kipatsiki"], "kaniri"),
    ).toBe("Nokoi kaniri kipatsiki");
  });

  it("keeps the punctuation where the source had it", () => {
    expect(toSentenceText(["¿Jaoka", "ojitari", null, "?"], "kaniri")).toBe(
      "¿Jaoka ojitari kaniri?",
    );
  });
});
