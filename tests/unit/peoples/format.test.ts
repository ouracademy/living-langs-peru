import { describe, expect, it } from "vitest";

import { formatCount, formatDate, formatFigure } from "@/lib/peoples/format";
import type { Figure, FigureUnit } from "@/lib/peoples/types";

const NBSP = " ";

function figure(value: number, unit: FigureUnit): Figure {
  return { id: "x", label: "x", value, unit, sourceId: "s" };
}

describe("formatCount", () => {
  it("groups thousands with a non-breaking space", () => {
    expect(formatCount(118_277)).toBe(`118${NBSP}277`);
  });

  // A plain space lets the browser break "118 277" across two lines, which
  // reads as two different numbers.
  it("never emits a breakable space", () => {
    expect(formatCount(118_277)).not.toContain(" ");
  });

  it("leaves numbers under a thousand alone", () => {
    expect(formatCount(675)).toBe("675");
    expect(formatCount(1)).toBe("1");
    expect(formatCount(0)).toBe("0");
  });

  it("groups every three digits", () => {
    expect(formatCount(1_000)).toBe(`1${NBSP}000`);
    expect(formatCount(1_234_567)).toBe(`1${NBSP}234${NBSP}567`);
  });
});

describe("formatFigure", () => {
  it.each([
    [118_277, "people", `118${NBSP}277 personas`],
    [73_567, "speakers", `73${NBSP}567 hablantes`],
    [675, "localities", "675 localidades"],
    [405, "communities", "405 comunidades"],
  ] as const)("renders %i %s", (value, unit, expected) => {
    expect(formatFigure(figure(value, unit))).toBe(expected);
  });

  it.each([
    ["people", "1 persona"],
    ["speakers", "1 hablante"],
    ["localities", "1 localidad"],
    ["communities", "1 comunidad"],
  ] as const)("uses the singular of %s for one", (unit, expected) => {
    expect(formatFigure(figure(1, unit))).toBe(expected);
  });
});

describe("formatDate", () => {
  it("renders an ISO date in Spanish", () => {
    expect(formatDate("2026-09-11")).toBe("11 de septiembre de 2026");
  });

  // `new Date("2026-01-01")` is UTC midnight, which is still 31 December in
  // any negative offset. Parsing the parts keeps the day the source states.
  it("keeps the day the source states, in any timezone", () => {
    expect(formatDate("2026-01-01")).toBe("1 de enero de 2026");
    expect(formatDate("2026-12-31")).toBe("31 de diciembre de 2026");
  });

  it("drops no leading zero on the month", () => {
    expect(formatDate("2026-03-05")).toBe("5 de marzo de 2026");
  });
});
