import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import AshaninkaPage from "@/app/ashaninka/page";

beforeEach(() => {
  render(<AshaninkaPage />);
});

afterEach(cleanup);

/** The footnote numbers in the order the citation marks appear in the page. */
function citationNumbersInPageOrder(): number[] {
  return [...document.querySelectorAll("sup[id^='cita-'] a")].map((link) =>
    Number(link.textContent),
  );
}

describe("the /ashaninka page", () => {
  it("has a single h1 and its sections in reading order", () => {
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);

    const sections = screen
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent);

    expect(sections).toEqual([
      "Población",
      "Historia",
      "Territorio",
      "Vida cotidiana",
      "Línea de tiempo",
      "Galería",
      "Para seguir explorando",
      "Fuentes",
    ]);
  });

  it("gives each section a stable anchor in Spanish", () => {
    for (const id of ["historia", "territorio", "vida", "galeria", "fuentes"]) {
      expect(document.getElementById(id)?.tagName).toBe("SECTION");
    }
  });

  // AC-M2-10 / spec §4.2: a screen reader switches pronunciation on `lang`.
  it("sets every asháninka term in <i lang=cni>", () => {
    const marked = [...document.querySelectorAll("i[lang='cni']")].map(
      (node) => node.textContent,
    );

    expect(new Set(marked)).toEqual(
      new Set(["káapa", "intómoe", "kobintaantsi", "pinkathari", "sheripiari"]),
    );
  });

  it("never leaves one of those words outside the markup", () => {
    const life = screen.getByRole("region", { name: "Vida cotidiana" });

    for (const term of [
      "káapa",
      "intómoe",
      "kobintaantsi",
      "pinkathari",
      "sheripiari",
    ]) {
      const inText = (life.textContent ?? "").split(term).length - 1;
      const inMarkup = [...life.querySelectorAll("i[lang='cni']")].filter(
        (node) => node.textContent === term,
      ).length;

      expect(inMarkup, term).toBe(inText);
    }
  });

  // AC-M2-9
  it("links to the dictionary of the language", () => {
    const link = screen.getByRole("link", { name: /Diccionario asháninka/ });

    expect(link.getAttribute("href")).toBe("/diccionario/ashaninka");
  });

  it("offers the sources about the people, not the map's cartography credit", () => {
    const links = screen.getByRole("region", {
      name: "Para seguir explorando",
    });
    const external = within(links).getAllByRole("link", {
      name: /BDPI|Ashaninka|Asháninka/,
    });

    expect(external.length).toBeGreaterThanOrEqual(2);
    for (const link of external) {
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toContain("noopener");
    }
    expect(within(links).queryByText(/Natural Earth/)).toBeNull();
  });

  // The invariant the whole footnote design rests on: the first number a
  // reader meets is 1, and each new source takes the next one up.
  it("numbers the notes in the order the page shows them", () => {
    const seen: number[] = [];

    for (const number of citationNumbersInPageOrder()) {
      if (!seen.includes(number)) seen.push(number);
    }

    expect(seen).toEqual(seen.map((_, index) => index + 1));
    expect(seen.length).toBeGreaterThanOrEqual(3);
  });

  it("points every citation mark at a note that exists and leads back", () => {
    const marks = document.querySelectorAll("sup[id^='cita-'] a");

    expect(marks.length).toBeGreaterThan(10);
    for (const mark of marks) {
      const note = document.querySelector(mark.getAttribute("href") ?? "");

      expect(note, mark.getAttribute("href") ?? "").not.toBeNull();

      const back = note?.querySelector("a[href^='#cita-']");
      const target = document.getElementById(
        (back?.getAttribute("href") ?? "").slice(1),
      );

      expect(target).not.toBeNull();
    }
  });

  it("draws the map with the six regions and lists them as text", () => {
    const map = screen.getByRole("img", { name: /Mapa del Perú/ });

    expect(map.querySelectorAll("path")).toHaveLength(26);
    expect(map.querySelectorAll("path[fill='#E4572E']")).toHaveLength(6);

    const territory = screen.getByRole("region", { name: "Territorio" });

    // «Ucayali» is both a region and a river, so each list is read on its own.
    const listUnder = (heading: string) =>
      [
        ...(
          within(territory).getByRole("heading", { name: heading })
            .nextElementSibling ?? document.body
        ).querySelectorAll("li"),
      ].map((item) => item.textContent);

    expect(listUnder("Regiones")).toEqual([
      "Ayacucho",
      "Cusco",
      "Huánuco",
      "Junín",
      "Pasco",
      "Ucayali",
    ]);
    expect(listUnder("Ríos principales")).toEqual([
      "Pichis",
      "Perené",
      "Ene",
      "Tambo",
      "Ucayali",
    ]);
  });

  it("shows each photo with its author and licence under it", () => {
    const gallery = screen.getByRole("region", { name: "Galería" });
    const figures = gallery.querySelectorAll("figure");

    expect(figures.length).toBeGreaterThanOrEqual(4);
    for (const figure of figures) {
      expect(
        figure.querySelector("img")?.getAttribute("alt")?.length,
      ).toBeGreaterThan(20);
      expect(
        figure.querySelector("figcaption a")?.getAttribute("href"),
      ).toMatch(/^https:\/\/commons\.wikimedia\.org\//);
    }
  });
});
