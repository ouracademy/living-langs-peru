import { describe, expect, it } from "vitest";

import { photoFieldProblems, type PhotoFields } from "@/lib/admin/photo-fields";

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

  // AC-E3-4: every required field, one at a time.
  it.each(["alt", "author", "license", "url"] as const)(
    "rejects an empty %s",
    (field) => {
      const problems = photoFieldProblems({ ...valid, [field]: "   " });
      expect(Object.keys(problems)).toEqual([field]);
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

  it("only accepts https URLs", () => {
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
