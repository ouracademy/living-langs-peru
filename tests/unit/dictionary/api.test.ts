import { describe, expect, it } from "vitest";

import { GET as getEntry } from "@/app/api/diccionario/[lengua]/[id]/route";
import { GET as getLanguageEntries } from "@/app/api/diccionario/[lengua]/route";
import { GET as getLanguages } from "@/app/api/diccionario/route";

const request = (url: string) => new Request(`http://localhost${url}`);
const params = <T extends object>(value: T) => ({
  params: Promise.resolve(value),
});

describe("GET /api/diccionario", () => {
  // AC-M2-1
  it("lists languages that have a dictionary, with totals", async () => {
    const body = await (await getLanguages()).json();

    expect(body.languages).toEqual([
      { slug: "ashaninka", name: "Asháninka", total: expect.any(Number) },
    ]);
    expect(body.languages[0].total).toBeGreaterThan(0);
  });

  it("leaves out a language with no dictionary", async () => {
    const body = await (await getLanguages()).json();
    const slugs = body.languages.map((item: { slug: string }) => item.slug);

    expect(slugs).not.toContain("uro");
  });
});

describe("GET /api/diccionario/[lengua]", () => {
  // AC-M2-2
  it("returns entries in alphabetical order", async () => {
    const response = await getLanguageEntries(
      request("/api/diccionario/ashaninka"),
      params({ lengua: "ashaninka" }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.language).toBe("ashaninka");
    expect(body.entries.length).toBe(body.total);

    const words = body.entries.map((entry: { word: string }) => entry.word);
    expect(words).toEqual([...words].sort(new Intl.Collator("es").compare));
  });

  // AC-M2-3
  it("filters with q and reports total matches, not page size", async () => {
    const response = await getLanguageEntries(
      request("/api/diccionario/ashaninka?q=sankena&limit=2"),
      params({ lengua: "ashaninka" }),
    );
    const body = await response.json();

    expect(body.total).toBe(5);
    expect(body.entries).toHaveLength(2);
    expect(body.limit).toBe(2);
    expect(body.offset).toBe(0);
  });

  it("pages with offset", async () => {
    const all = await (
      await getLanguageEntries(
        request("/api/diccionario/ashaninka"),
        params({ lengua: "ashaninka" }),
      )
    ).json();
    const paged = await (
      await getLanguageEntries(
        request("/api/diccionario/ashaninka?offset=2&limit=1"),
        params({ lengua: "ashaninka" }),
      )
    ).json();

    expect(paged.entries[0]).toEqual(all.entries[2]);
  });

  // AC-M2-4
  it("rejects an out-of-range or non-numeric limit", async () => {
    for (const query of [
      "?limit=1000",
      "?limit=abc",
      "?limit=0",
      "?offset=-1",
    ]) {
      const response = await getLanguageEntries(
        request(`/api/diccionario/ashaninka${query}`),
        params({ lengua: "ashaninka" }),
      );

      expect(response.status, query).toBe(400);
      expect((await response.json()).error).toBe("invalid_parameter");
    }
  });

  // AC-M2-5
  it("404s for a language with no dictionary", async () => {
    const response = await getLanguageEntries(
      request("/api/diccionario/uro"),
      params({ lengua: "uro" }),
    );

    expect(response.status).toBe(404);
    expect((await response.json()).error).toBe("language_not_found");
  });
});

describe("GET /api/diccionario/[lengua]/[id]", () => {
  it("returns a single entry", async () => {
    const response = await getEntry(
      request("/api/diccionario/ashaninka/abakerone"),
      params({ lengua: "ashaninka", id: "abakerone" }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.entry.word).toBe("abakerone");
  });

  // AC-M2-6
  it("404s for an unknown entry", async () => {
    const response = await getEntry(
      request("/api/diccionario/ashaninka/nope"),
      params({ lengua: "ashaninka", id: "nope" }),
    );

    expect(response.status).toBe(404);
    expect((await response.json()).error).toBe("entry_not_found");
  });

  it("404s for a language with no dictionary", async () => {
    const response = await getEntry(
      request("/api/diccionario/uro/x"),
      params({ lengua: "uro", id: "x" }),
    );

    expect((await response.json()).error).toBe("language_not_found");
  });
});
