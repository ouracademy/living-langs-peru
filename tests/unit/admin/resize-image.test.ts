import { describe, expect, it } from "vitest";

import {
  inputProblem,
  isAcceptedType,
  MAX_INPUT_BYTES,
  targetSize,
} from "@/components/admin/resize-image";

describe("targetSize", () => {
  // AC-E3-1: longest side at most 2400 px, proportions kept.
  it("reduces a 12 MP landscape photo to 2400 px wide", () => {
    expect(targetSize(4000, 3000)).toEqual({ width: 2400, height: 1800 });
  });

  it("reduces a portrait photo by its height", () => {
    expect(targetSize(3024, 4032)).toEqual({ width: 1800, height: 2400 });
  });

  it("never enlarges a small photo", () => {
    expect(targetSize(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it("never rounds a side down to zero", () => {
    expect(targetSize(10000, 2)).toEqual({ width: 2400, height: 1 });
  });
});

describe("input checks", () => {
  it.each(["image/jpeg", "image/png", "image/webp"])("accepts %s", (type) => {
    expect(isAcceptedType(type)).toBe(true);
    expect(inputProblem({ type, size: 1024 })).toBeNull();
  });

  it.each(["image/heic", "image/gif", "application/pdf", ""])(
    "refuses %s",
    (type) => {
      expect(inputProblem({ type, size: 1024 })).toBe("unsupported_type");
    },
  );

  it("refuses a file too heavy to decode", () => {
    expect(
      inputProblem({ type: "image/jpeg", size: MAX_INPUT_BYTES + 1 }),
    ).toBe("too_large");
  });
});
