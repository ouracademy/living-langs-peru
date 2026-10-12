import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { privacyPolicy } from "@/lib/privacy/policy";
import type { PolicyBlock } from "@/lib/privacy/policy";

const doc = readFileSync(
  join(process.cwd(), "docs", "politica-privacidad.md"),
  "utf8",
);

// Words only: markdown and page markup differ, the text must not.
const words = (text: string) =>
  text
    .replace(/\*\*/g, "")
    .replace(/^[\s\-|:]+$/gm, " ")
    .replace(/\|/g, " ")
    .replace(/^\s*-\s+/gm, "")
    .replace(/^#+\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();

const blockText = (block: PolicyBlock): string => {
  if (block.kind === "paragraph") return block.text;
  if (block.kind === "list") return block.items.join(" ");
  return [block.head, ...block.rows].map((row) => row.join(" ")).join(" ");
};

const pageText = () =>
  [
    privacyPolicy.title,
    `Última actualización: ${privacyPolicy.updatedAt}`,
    privacyPolicy.intro,
    ...privacyPolicy.sections.flatMap((section) => [
      section.title,
      ...section.blocks.map(blockText),
    ]),
  ].join(" ");

describe("privacy policy page text", () => {
  // AC-S4-2
  it("says exactly what docs/politica-privacidad.md says", () => {
    expect(words(pageText())).toBe(words(doc));
  });

  it("has the nine sections, in order, with unique anchors", () => {
    expect(privacyPolicy.sections).toHaveLength(9);
    expect(
      privacyPolicy.sections.map((section) => section.title.slice(0, 2)),
    ).toEqual(["1.", "2.", "3.", "4.", "5.", "6.", "7.", "8.", "9."]);
    const ids = privacyPolicy.sections.map((section) => section.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // AC-S4-3
  it("has no unfilled [PLACEHOLDER] left, in the document or in the page", () => {
    const placeholder = /\[[^\]]*\]/;
    expect(doc).not.toMatch(placeholder);
    expect(pageText()).not.toMatch(placeholder);
  });

  // AC-S4-4
  it("declares the fields the table stores and that the IP is not kept", () => {
    const text = pageText().toLowerCase();
    for (const field of [
      "nombre",
      "teléfono",
      "correo electrónico",
      "rol",
      "motivo",
      "aceptaste",
      "fecha y hora",
    ]) {
      expect(text).toContain(field);
    }
    expect(text).toContain("no guardamos tu dirección ip");
  });

  it("does not mention a rate limiter or a provider we do not use", () => {
    const text = pageText().toLowerCase();
    expect(text).not.toContain("upstash");
    expect(text).not.toContain("redis");
  });
});
