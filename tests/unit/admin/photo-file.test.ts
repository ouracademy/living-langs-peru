import { describe, expect, it } from "vitest";

import { inspectPhoto, MAX_PHOTO_BYTES } from "@/lib/admin/photo-file";

import { jpeg, png } from "./jpeg-fixture";

describe("inspectPhoto", () => {
  // AC-E3-3: the dimensions come from the file, not from the form.
  it("reads the real dimensions of a JPEG", () => {
    expect(inspectPhoto(jpeg(2400, 1600))).toEqual({
      ok: true,
      width: 2400,
      height: 1600,
    });
    expect(inspectPhoto(jpeg(900, 1350))).toEqual({
      ok: true,
      width: 900,
      height: 1350,
    });
  });

  it.each([
    ["a PNG", png(800, 600)],
    ["random bytes", new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])],
    ["an empty file", new Uint8Array()],
  ])("rejects %s", (_, bytes) => {
    expect(inspectPhoto(bytes)).toMatchObject({ ok: false });
  });

  it("rejects a side above 2400 px", () => {
    expect(inspectPhoto(jpeg(2401, 1000))).toMatchObject({ ok: false });
    expect(inspectPhoto(jpeg(1000, 3000))).toMatchObject({ ok: false });
  });

  it("rejects a file above 3 MB", () => {
    const big = jpeg(2400, 1600, MAX_PHOTO_BYTES);
    expect(big.length).toBeGreaterThan(MAX_PHOTO_BYTES);
    expect(inspectPhoto(big)).toMatchObject({ ok: false });
  });

  it("explains the problem in Spanish", () => {
    const result = inspectPhoto(png(10, 10));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/JPEG/);
  });
});
