import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  bundleFileName,
  bundleTemplate,
  diffBundles,
  exportBundleText,
  importBundleText,
  isEmptyDiff,
  summarizeBundle,
} from "@/lib/language-bundles/bundle-file";
import { parseBundle } from "@/lib/language-bundles/schema";

import { testBundle, testEntry } from "./fixtures";

describe("importBundleText", () => {
  it("refuses a text that is not JSON", () => {
    const result = importBundleText("{ no es json");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problems[0]).toMatch(/JSON válido/);
  });

  it("refuses JSON that is not a language bundle, whole", () => {
    const result = importBundleText(JSON.stringify({ schema: "otra-cosa" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problems.length).toBeGreaterThan(0);
  });

  it("accepts a valid bundle, and exporting it gives the same bundle back", () => {
    const bundle = testBundle();
    const result = importBundleText(exportBundleText(bundle));
    expect(result).toEqual({ ok: true, bundle });
  });
});

describe("bundleFileName", () => {
  it("names the working copy, a version and the template", () => {
    expect(bundleFileName("uro")).toBe("uro-copia.json");
    expect(bundleFileName("uro", 3)).toBe("uro-v3.json");
    expect(bundleFileName("uro", "plantilla")).toBe("uro-plantilla.json");
  });
});

describe("summarizeBundle", () => {
  it("counts entries, verified entries and themes", () => {
    const bundle = testBundle({
      entries: [testEntry(), testEntry({ id: "otra", verified: false })],
    });
    expect(summarizeBundle(bundle)).toEqual({
      entries: 2,
      verified: 1,
      themes: 1,
    });
  });
});

describe("bundleTemplate", () => {
  it("is the uro template of docs/gestor-lenguas, and it parses", () => {
    const file = JSON.parse(
      readFileSync(
        join(process.cwd(), "docs/gestor-lenguas/plantilla-uro.json"),
        "utf8",
      ),
    );
    expect(bundleTemplate("uro")).toEqual(file);
    expect(parseBundle(bundleTemplate("uro")).ok).toBe(true);
  });

  it("only uses placeholder words", () => {
    const text = JSON.stringify(bundleTemplate("ashaninka"));
    for (const entry of bundleTemplate("ashaninka").entries) {
      expect(entry.word).toMatch(/PRUEBA/);
    }
    expect(text).toMatch(/COMPLETAR/);
  });
});

describe("diffBundles", () => {
  it("finds added, changed and missing entries by id", () => {
    const before = testBundle();
    const after = testBundle({
      entries: [
        testEntry({ translations: ["PRUEBA uno corregida"] }),
        testEntry({ id: "prueba-cuatro", word: "mano" }),
        before.entries[2],
      ],
    });

    const diff = diffBundles(before, after);

    expect(diff.added).toEqual(["prueba-cuatro"]);
    expect(diff.changed).toEqual(["prueba-uno"]);
    expect(diff.missing).toEqual(["prueba-dos"]);
    expect(diff.restChanged).toBe(false);
    expect(isEmptyDiff(diff)).toBe(false);
  });

  it("notices a change outside the entries", () => {
    const before = testBundle();
    const after = testBundle({ translationLabel: "español" });

    const diff = diffBundles(before, after);

    expect(diff.restChanged).toBe(true);
    expect(isEmptyDiff(diff)).toBe(false);
  });

  it("is empty for the same content", () => {
    expect(isEmptyDiff(diffBundles(testBundle(), testBundle()))).toBe(true);
  });
});
