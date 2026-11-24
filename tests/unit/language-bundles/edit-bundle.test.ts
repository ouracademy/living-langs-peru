import { describe, expect, it } from "vitest";

import {
  addEntry,
  addGrapheme,
  addSource,
  addTheme,
  checkEntryFields,
  checkSourceFields,
  EMPTY_SOURCE_FIELDS,
  emptyEntryFields,
  entryToFields,
  fieldsToEntryData,
  filterEntries,
  formatConfusable,
  formatVowelVariants,
  lettersOutsideAlphabet,
  moveGrapheme,
  NO_FILTER,
  parseConfusable,
  parseVowelVariants,
  removeEntry,
  removeGrapheme,
  removeSource,
  removeTheme,
  setAlphabetSource,
  setThemeEntry,
  setVowel,
  sourceToFields,
  sourceUsage,
  themesWithEntry,
  uniqueId,
  updateAlphabetMaps,
  updateEntry,
  updateSource,
  updateTheme,
  verifyEntries,
} from "@/lib/language-bundles/edit-bundle";
import { parseBundle } from "@/lib/language-bundles/schema";
import type { LanguageBundle } from "@/lib/language-bundles/types";

import { testBundle, testEntry } from "./fixtures";

/** Every edit has to leave a bundle the working copy can be read back as. */
function expectValid(bundle: LanguageBundle) {
  const parsed = parseBundle(bundle);
  expect(parsed.ok ? [] : parsed.issues).toEqual([]);
}

function unwrap(result: {
  ok: boolean;
  bundle?: LanguageBundle;
  reason?: string;
}) {
  if (!result.ok || !result.bundle) throw new Error(result.reason);
  return result.bundle;
}

describe("uniqueId", () => {
  it("slugs the text and skips ids already taken", () => {
    expect(uniqueId("Ñaña PRUEBA", [], "x")).toBe("nana-prueba");
    expect(uniqueId("pato", ["pato", "pato-2"], "x")).toBe("pato-3");
    expect(uniqueId("¿?", [], "entrada")).toBe("entrada");
  });
});

describe("entries", () => {
  // AC-L4-3
  it("edits a word without changing its id, and the themes still find it", () => {
    const bundle = updateEntry(testBundle(), "prueba-uno", {
      word: "patito",
      translations: ["PRUEBA corregida"],
    });
    const entry = bundle.entries.find((each) => each.id === "prueba-uno");
    expect(entry?.word).toBe("patito");
    expect(entry?.translations).toEqual(["PRUEBA corregida"]);
    expect(bundle.themes[0].entryIds).toContain("prueba-uno");
    expectValid(bundle);
  });

  it("drops optional fields left empty", () => {
    const bundle = updateEntry(testBundle(), "prueba-uno", {
      emoji: "",
      notes: "  ",
      examples: [],
    });
    const entry = bundle.entries.find((each) => each.id === "prueba-uno");
    expect(entry).not.toHaveProperty("emoji");
    expect(entry).not.toHaveProperty("notes");
    expect(entry).not.toHaveProperty("examples");
    expectValid(bundle);
  });

  it("adds a word with a fresh id from its spelling", () => {
    const { bundle, id } = addEntry(testBundle(), {
      word: "pato",
      translations: ["PRUEBA nueva"],
      sourceId: "fuente-prueba",
      verified: false,
    });
    expect(id).toBe("pato");
    expect(bundle.entries.at(-1)?.id).toBe("pato");
    expectValid(bundle);
  });

  it("removes a word and takes it out of its themes", () => {
    const bundle = unwrap(removeEntry(testBundle(), "prueba-dos"));
    expect(bundle.entries.map((entry) => entry.id)).not.toContain("prueba-dos");
    expect(bundle.themes[0].entryIds).not.toContain("prueba-dos");
    expectValid(bundle);
  });

  it("refuses to leave a theme with no word", () => {
    const base = testBundle({
      themes: [
        {
          id: "solo",
          name: "Solo",
          icon: "🧪",
          mode: "first",
          entryIds: ["prueba-uno"],
        },
      ],
    });
    const result = removeEntry(base, "prueba-uno");
    expect(result.ok).toBe(false);
    expect(result.ok ? "" : result.reason).toContain("«Solo»");
  });

  it("names the themes that show a word", () => {
    expect(themesWithEntry(testBundle(), "prueba-uno")).toEqual([
      "Tema de PRUEBA",
    ]);
  });

  it("verifies the chosen words and records who checked them", () => {
    const base = testBundle({
      entries: [
        testEntry({ verified: false }),
        testEntry({ id: "otra", verified: false }),
      ],
      themes: [],
    });
    const bundle = verifyEntries(base, ["prueba-uno"], " Hablante de PRUEBA ");
    expect(bundle.entries[0]).toMatchObject({
      verified: true,
      verifiedBy: "Hablante de PRUEBA",
    });
    expect(bundle.entries[1].verified).toBe(false);
    expectValid(bundle);
  });
});

describe("filterEntries", () => {
  const bundle = testBundle({
    entries: [
      testEntry({ id: "uno", word: "pato", translations: ["PRUEBA ave"] }),
      testEntry({ id: "dos", word: "mesa", verified: false, emoji: undefined }),
      testEntry({ id: "tres", word: "zorro", translations: ["PRUEBA tres"] }),
    ],
    themes: [],
  });
  const ids = (filter: Partial<typeof NO_FILTER>) =>
    filterEntries(bundle, { ...NO_FILTER, ...filter }).map((entry) => entry.id);

  it("searches the word, its variants and translations, without accents", () => {
    expect(ids({ query: "AVÉ" })).toEqual(["uno"]);
    expect(ids({ query: "mes" })).toEqual(["dos"]);
  });

  it("filters unverified, without a picture and outside the alphabet", () => {
    expect(ids({ unverified: true })).toEqual(["dos"]);
    expect(ids({ noEmoji: true })).toEqual(["dos"]);
    expect(ids({ outsideAlphabet: true })).toEqual(["tres"]);
  });

  it("lists the letters outside the alphabet", () => {
    expect(lettersOutsideAlphabet("zorro", ["o", "r"])).toEqual(["z"]);
    expect(lettersOutsideAlphabet("chato", ["ch", "a", "t", "o"])).toEqual([]);
  });
});

describe("entry form", () => {
  it("round-trips an entry through its fields", () => {
    const entry = testEntry({
      variants: ["patu"],
      translations: ["PRUEBA uno", "PRUEBA bis"],
      partOfSpeech: "noun",
      examples: [{ sentence: "un pato", translation: "PRUEBA" }],
      notes: "nota",
      sourceRef: "p. 1",
      verifiedBy: "PRUEBA",
    });
    const fields = entryToFields(entry);
    expect(fields.translations).toBe("PRUEBA uno\nPRUEBA bis");
    const data = fieldsToEntryData(fields, entry);
    expect({ ...data, id: entry.id }).toEqual(entry);
  });

  it("checks the required fields and the examples", () => {
    const bundle = testBundle();
    const errors = checkEntryFields(
      {
        ...emptyEntryFields("no-existe"),
        emoji: "🦆🦆🦆🦆🦆🦆🦆🦆🦆",
        examples: [{ sentence: "solo la oración", translation: "" }],
      },
      bundle,
    );
    expect(Object.keys(errors).sort()).toEqual([
      "emoji",
      "examples",
      "sourceId",
      "translations",
      "word",
    ]);
    expect(checkEntryFields(entryToFields(bundle.entries[0]), bundle)).toEqual(
      {},
    );
  });
});

describe("themes", () => {
  it("adds a theme with at least one word, and refuses an empty one", () => {
    const added = addTheme(
      testBundle(),
      { name: "Animales de PRUEBA", icon: "🐾", mode: "word2pic" },
      ["prueba-uno", "prueba-uno"],
    );
    if (!added.ok) throw new Error(added.reason);
    expect(added.id).toBe("animales-de-prueba");
    expect(added.bundle.themes.at(-1)?.entryIds).toEqual(["prueba-uno"]);
    expectValid(added.bundle);

    expect(
      addTheme(testBundle(), { name: "Vacío", icon: "🧪", mode: "first" }, [])
        .ok,
    ).toBe(false);
  });

  it("renames, changes the icon and the mode, and refuses an empty name", () => {
    const bundle = unwrap(
      updateTheme(testBundle(), "tema-prueba", {
        name: "Otro nombre",
        icon: "⭐",
        mode: "vowel",
      }),
    );
    expect(bundle.themes[0]).toMatchObject({
      id: "tema-prueba",
      name: "Otro nombre",
      icon: "⭐",
      mode: "vowel",
    });
    expect(updateTheme(testBundle(), "tema-prueba", { name: " " }).ok).toBe(
      false,
    );
  });

  it("puts words in a theme and takes them out, keeping at least one", () => {
    const base = testBundle({
      themes: [
        {
          id: "t",
          name: "T",
          icon: "🧪",
          mode: "first",
          entryIds: ["prueba-uno"],
        },
      ],
    });
    const added = unwrap(setThemeEntry(base, "t", "prueba-dos", true));
    expect(added.themes[0].entryIds).toEqual(["prueba-uno", "prueba-dos"]);
    const removed = unwrap(setThemeEntry(added, "t", "prueba-uno", false));
    expect(removed.themes[0].entryIds).toEqual(["prueba-dos"]);
    expect(setThemeEntry(removed, "t", "prueba-dos", false).ok).toBe(false);
    expectValid(removed);
  });

  it("removes a theme", () => {
    expect(removeTheme(testBundle(), "tema-prueba").themes).toEqual([]);
  });
});

describe("alphabet", () => {
  // AC-L4-4
  it("adds, moves and removes letters", () => {
    let bundle = unwrap(addGrapheme(testBundle(), " Ñ "));
    expect(bundle.alphabet.graphemes.at(-1)).toBe("ñ");
    expect(addGrapheme(bundle, "ñ").ok).toBe(false);
    expect(addGrapheme(bundle, "a b").ok).toBe(false);

    bundle = moveGrapheme(bundle, 0, 1);
    expect(bundle.alphabet.graphemes.slice(0, 2)).toEqual(["e", "a"]);
    expect(moveGrapheme(bundle, 0, -1)).toBe(bundle);

    bundle = unwrap(removeGrapheme(bundle, "a"));
    expect(bundle.alphabet.graphemes).not.toContain("a");
    expect(bundle.alphabet.vowels).not.toContain("a");
    expectValid(bundle);
  });

  it("keeps at least one letter and one vowel", () => {
    const one = testBundle({
      alphabet: { graphemes: ["a"], vowels: ["a"] },
    });
    expect(removeGrapheme(one, "a").ok).toBe(false);
    const twoLetters = testBundle({
      alphabet: { graphemes: ["a", "p"], vowels: ["a"] },
    });
    expect(removeGrapheme(twoLetters, "a").ok).toBe(false);
    expect(setVowel(twoLetters, "a", false).ok).toBe(false);
  });

  it("marks vowels in the alphabet's order", () => {
    const bundle = unwrap(setVowel(testBundle(), "p", true));
    expect(bundle.alphabet.vowels).toEqual(["a", "e", "i", "o", "p"]);
    const back = unwrap(setVowel(bundle, "p", false));
    expect(back.alphabet.vowels).toEqual(["a", "e", "i", "o"]);
  });

  it("drops a removed letter from the confusables", () => {
    const base = testBundle();
    base.alphabet.confusable = { ch: ["s", "t"], s: ["ch"] };
    const bundle = unwrap(removeGrapheme(base, "s"));
    expect(bundle.alphabet.confusable).toEqual({ ch: ["t"] });
  });

  it("sets and clears the alphabet's source", () => {
    expect(setAlphabetSource(testBundle(), "").alphabet).not.toHaveProperty(
      "sourceId",
    );
    expect(
      setAlphabetSource(testBundle(), "fuente-prueba").alphabet.sourceId,
    ).toBe("fuente-prueba");
  });

  it("reads and writes variants and confusables as text", () => {
    expect(formatVowelVariants({ á: "a", é: "e" })).toBe("á=a, é=e");
    expect(parseVowelVariants("á=a, é = e")).toEqual({
      ok: true,
      value: { á: "a", é: "e" },
    });
    expect(parseVowelVariants("á").ok).toBe(false);

    expect(formatConfusable({ ts: ["ch", "s"] })).toBe("ts: ch, s");
    expect(parseConfusable("ts: ch, s\n\nsh: s")).toEqual({
      ok: true,
      value: { ts: ["ch", "s"], sh: ["s"] },
    });
    expect(parseConfusable("ts").ok).toBe(false);

    const cleared = updateAlphabetMaps(
      updateAlphabetMaps(testBundle(), { vowelVariants: { á: "a" } }),
      { vowelVariants: {} },
    );
    expect(cleared.alphabet).not.toHaveProperty("vowelVariants");
  });
});

describe("sources", () => {
  // AC-L4-5
  it("counts who cites a source and refuses to remove a cited one", () => {
    const base = testBundle();
    expect(sourceUsage(base, "fuente-prueba")).toEqual({
      entries: 3,
      examples: 0,
      alphabet: true,
    });
    const result = removeSource(base, "fuente-prueba");
    expect(result.ok).toBe(false);
    expect(result.ok ? "" : result.reason).toContain("3 palabras");
  });

  it("adds, edits and removes an unused source, but keeps at least one", () => {
    const { bundle, id } = addSource(testBundle(), {
      ...EMPTY_SOURCE_FIELDS,
      title: "Otra fuente de PRUEBA",
      year: "1934",
      authors: "Una, Otra",
      url: "https://example.org/otra",
    });
    expect(id).toBe("otra-fuente-de-prueba");
    expect(bundle.sources.at(-1)).toMatchObject({
      year: 1934,
      authors: ["Una", "Otra"],
    });
    expectValid(bundle);

    const edited = updateSource(bundle, id, {
      ...sourceToFields(bundle.sources.at(-1)!),
      kind: "speaker",
      url: "",
    });
    expect(edited.sources.at(-1)).not.toHaveProperty("url");
    expect(edited.sources.at(-1)?.kind).toBe("speaker");

    const removed = unwrap(removeSource(edited, id));
    expect(removed.sources).toHaveLength(1);

    const lone = testBundle({
      entries: [],
      themes: [],
      alphabet: { graphemes: ["a"], vowels: ["a"] },
    });
    expect(removeSource(lone, "fuente-prueba").ok).toBe(false);
  });

  it("checks the title, the year and the link", () => {
    expect(
      Object.keys(
        checkSourceFields({
          ...EMPTY_SOURCE_FIELDS,
          year: "mil",
          url: "ftp://x",
        }),
      ).sort(),
    ).toEqual(["title", "url", "year"]);
  });
});
