import { describe, expect, it } from "vitest";

import { ashaninka } from "@/lib/peoples";

describe("ashaninka data", () => {
  it("exposes the people with its summary, language and sources", () => {
    expect(ashaninka.slug).toBe("ashaninka");
    expect(ashaninka.name).toBe("Asháninka");
    expect(ashaninka.summary.text).not.toBe("");
    expect(ashaninka.summary.sourceIds.length).toBeGreaterThan(0);
    expect(ashaninka.language.family).toBe("Arawak");
    expect(ashaninka.language.isoCodes).toContain("cni");
    expect(ashaninka.sources.length).toBeGreaterThan(0);
  });

  // The 2017 census yields three different numbers and the page must never
  // collapse them into "the Asháninka population is X". See spec §5.3.
  it.each([
    ["population-localities", 118_277],
    ["self-identified", 55_493],
    ["childhood-speakers", 73_567],
  ])("reports %s as %i with an explanatory note", (id, value) => {
    const figure = ashaninka.figures.find((candidate) => candidate.id === id);

    expect(figure?.value).toBe(value);
    expect(figure?.year).toBe(2017);
    expect(figure?.note ?? "").not.toBe("");
  });

  it("keeps the three census figures distinct", () => {
    const values = [
      "population-localities",
      "self-identified",
      "childhood-speakers",
    ].map((id) => ashaninka.figures.find((figure) => figure.id === id)?.value);

    expect(new Set(values).size).toBe(3);
  });

  it("cites no source that was withdrawn from the research", () => {
    // CARE was dropped on 2026-09-14; see docs/ashaninka-sources.md §4.
    const urls = ashaninka.sources.map((source) => source.url).join(" ");

    expect(urls).not.toContain("careashaninka");
  });
});
