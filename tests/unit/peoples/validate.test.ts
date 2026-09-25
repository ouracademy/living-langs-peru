import { describe, expect, it } from "vitest";

import { ashaninka } from "@/lib/peoples";
import { validatePeople } from "@/lib/peoples/validate";
import type { People } from "@/lib/peoples/types";

/** A copy of the real data, so each case breaks exactly one rule. */
function broken(mutate: (people: People) => void): People {
  const copy = structuredClone(ashaninka);

  mutate(copy);

  return copy;
}

function problemsOf(people: People): string {
  return validatePeople(people).join(" | ");
}

describe("validatePeople", () => {
  it("passes on the real data", () => {
    expect(validatePeople(ashaninka)).toEqual([]);
  });

  it("rejects a citation with no matching source", () => {
    const people = broken((copy) => {
      copy.sections[0].paragraphs[0].sourceIds = ["no-existe"];
    });

    expect(problemsOf(people)).toContain("no-existe");
  });

  it("rejects a paragraph with no source at all", () => {
    const people = broken((copy) => {
      copy.sections[0].paragraphs[0].sourceIds = [];
    });

    expect(problemsOf(people)).toMatch(/sin fuente/i);
  });

  it("rejects a source that nothing cites", () => {
    const people = broken((copy) => {
      copy.sources.push({
        id: "huerfana",
        title: "Nadie me cita",
        publisher: "X",
        url: "https://example.org",
        retrievedAt: "2026-09-16",
      });
    });

    expect(problemsOf(people)).toContain("huerfana");
  });

  it("rejects a retrieval date that is not a calendar date", () => {
    expect(
      problemsOf(broken((c) => (c.sources[0].retrievedAt = "11/09/2026"))),
    ).toMatch(/retrievedAt/);
    expect(
      problemsOf(broken((c) => (c.sources[0].retrievedAt = "2026-13-01"))),
    ).toMatch(/retrievedAt/);
  });

  it("rejects duplicate figure and section ids", () => {
    const withFigures = broken((copy) => {
      copy.figures[1].id = copy.figures[0].id;
    });
    const withSections = broken((copy) => {
      copy.sections.push({ ...copy.sections[0] });
    });

    expect(problemsOf(withFigures)).toMatch(/duplicad/i);
    expect(problemsOf(withSections)).toMatch(/duplicad/i);
  });

  // The three 2017 census counts measure different things. Without the note
  // that says so, the page invites the reader to conflate them. Spec §5.3.
  it("requires an explanatory note on each of the three census figures", () => {
    const people = broken((copy) => {
      delete copy.figures[0].note;
    });

    expect(problemsOf(people)).toContain("population-localities");
  });

  it("rejects a photo without alt text or without full credit", () => {
    const photo = {
      src: "/peoples/ashaninka/x.jpg",
      width: 800,
      height: 600,
      alt: "Una persona asháninka tejiendo",
      credit: {
        author: "Alguien",
        license: "CC BY-SA 4.0",
        url: "https://commons.wikimedia.org/wiki/File:X",
      },
    };

    expect(validatePeople(broken((c) => c.photos.push(photo)))).toEqual([]);
    expect(
      problemsOf(broken((c) => c.photos.push({ ...photo, alt: " " }))),
    ).toMatch(/alt/i);
    expect(
      problemsOf(
        broken((c) =>
          c.photos.push({ ...photo, credit: { ...photo.credit, license: "" } }),
        ),
      ),
    ).toMatch(/licencia|credit/i);
  });

  // AC-M3-3: an alt that says «foto» describes nothing to someone who cannot
  // see the image. The check is on the whole value, not a substring: a real
  // alt may legitimately open with «Fotografía antigua de …».
  it("rejects a generic alt but keeps a descriptive one that mentions a photo", () => {
    const photo = {
      src: "/peoples/ashaninka/x.jpg",
      width: 800,
      height: 600,
      alt: "Una persona asháninka tejiendo",
      credit: {
        author: "Alguien",
        license: "CC BY-SA 4.0",
        url: "https://commons.wikimedia.org/wiki/File:X",
      },
    };

    for (const alt of ["foto", "Imagen", "  FOTOGRAFÍA  ", "photo."]) {
      expect(
        problemsOf(broken((c) => c.photos.push({ ...photo, alt }))),
      ).toMatch(/genérico/i);
    }

    expect(
      validatePeople(
        broken((c) =>
          c.photos.push({
            ...photo,
            alt: "Fotografía antigua de una casa comunal de techo de palma.",
          }),
        ),
      ),
    ).toEqual([]);
  });

  // AC-M3-7: without real dimensions the browser cannot reserve the box and
  // the gallery shifts as each file arrives.
  it("rejects a photo with no usable dimensions", () => {
    const photo = {
      src: "/peoples/ashaninka/x.jpg",
      width: 0,
      height: 600,
      alt: "Una persona asháninka tejiendo",
      credit: {
        author: "Alguien",
        license: "CC BY-SA 4.0",
        url: "https://commons.wikimedia.org/wiki/File:X",
      },
    };

    expect(problemsOf(broken((c) => c.photos.push(photo)))).toMatch(
      /width|height|dimensi/i,
    );
  });

  // AC-M1-12: a region the map cannot draw would vanish from the SVG without
  // a word. The data is wrong, so the check fails instead.
  it("rejects a region that the map has no department for", () => {
    const people = broken((copy) => {
      copy.territory.regions = [...copy.territory.regions, "Atlántida"];
    });

    expect(problemsOf(people)).toMatch(/Atlántida/);
  });

  it("reports every problem, not just the first", () => {
    const people = broken((copy) => {
      copy.sections[0].paragraphs[0].sourceIds = [];
      copy.figures[1].id = copy.figures[0].id;
    });

    expect(validatePeople(people).length).toBeGreaterThan(1);
  });
});
