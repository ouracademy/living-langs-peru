import { describe, expect, it } from "vitest";

import {
  creditFrom,
  DEFAULT_CREDIT,
  EMPTY_PHOTO_FIELDS,
  photoFieldProblems,
  type PhotoFields,
  withCreditDefaults,
} from "@/lib/admin/photo-fields";

const valid: PhotoFields = {
  alt: "Tres mujeres asháninka tejen una cushma bajo un techo de palma.",
  caption: "",
  author: "Centro de la Mujer Peruana Flora Tristán",
  license: "CC BY-SA 4.0",
  url: "https://commons.wikimedia.org/wiki/File:Ejemplo.jpg",
};

describe("photoFieldProblems", () => {
  it("accepts a complete photo, with or without caption", () => {
    expect(photoFieldProblems(valid)).toEqual({});
    expect(
      photoFieldProblems({ ...valid, caption: "Taller de tejido, 2025." }),
    ).toEqual({});
  });

  // 2026-11-18: the description is the one required text.
  it("rejects an empty description", () => {
    expect(Object.keys(photoFieldProblems({ ...valid, alt: "   " }))).toEqual([
      "alt",
    ]);
  });

  it.each(["author", "license", "url"] as const)(
    "accepts an empty %s",
    (field) => {
      expect(photoFieldProblems({ ...valid, [field]: "   " })).toEqual({});
    },
  );

  // AC-E3-4: same rule as peoples:check, not a copy.
  it.each(["Foto", "imagen", "Fotografía."])(
    "rejects a generic description («%s»)",
    (alt) => {
      expect(photoFieldProblems({ ...valid, alt }).alt).toMatch(/genérica/);
    },
  );

  it("enforces the lengths of spec §6.3", () => {
    expect(photoFieldProblems({ ...valid, alt: "Una casa." }).alt).toMatch(
      /10/,
    );
    expect(photoFieldProblems({ ...valid, alt: "a".repeat(301) }).alt).toMatch(
      /300/,
    );
    expect(
      photoFieldProblems({ ...valid, caption: "a".repeat(201) }).caption,
    ).toMatch(/200/);
    expect(
      photoFieldProblems({ ...valid, author: "a".repeat(121) }).author,
    ).toMatch(/120/);
    expect(
      photoFieldProblems({ ...valid, license: "a".repeat(121) }).license,
    ).toMatch(/120/);
  });

  it("only accepts https URLs when there is one", () => {
    for (const url of [
      "http://commons.wikimedia.org/x",
      "javascript:alert(1)",
      "commons.wikimedia.org/x",
      "https://",
    ]) {
      expect(photoFieldProblems({ ...valid, url }).url).toBeDefined();
    }
  });
});

describe("the team's credit (2026-11-18)", () => {
  it("is what a new photo starts with", () => {
    expect(EMPTY_PHOTO_FIELDS).toMatchObject({
      author: "Living Langs Peru",
      license: "Foto del equipo",
      url: "",
    });
    expect(DEFAULT_CREDIT.author).toBe(EMPTY_PHOTO_FIELDS.author);
  });

  it("fills an empty author or license, and keeps what was typed", () => {
    expect(
      withCreditDefaults({ ...valid, author: " ", license: "" }),
    ).toMatchObject({
      author: "Living Langs Peru",
      license: "Foto del equipo",
    });
    expect(withCreditDefaults({ ...valid, author: "  Ana  " }).author).toBe(
      "Ana",
    );
  });

  it("writes no url key when there is no source page", () => {
    expect(creditFrom({ ...valid, url: "  " })).toEqual({
      author: valid.author,
      license: valid.license,
    });
    expect(creditFrom(valid).url).toBe(valid.url);
  });
});
