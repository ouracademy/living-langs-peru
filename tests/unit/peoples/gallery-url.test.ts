import { describe, expect, it } from "vitest";

import {
  galleryObjectPath,
  galleryObjectPathOf,
  galleryPublicBase,
  galleryRemotePattern,
  supabaseOrigin,
} from "@/lib/peoples/gallery-url";

const URL_OK = "https://proyecto.supabase.co";
const BASE = `${URL_OK}/storage/v1/object/public/gallery`;

describe("supabaseOrigin", () => {
  it.each([
    [URL_OK, URL_OK],
    // A URL pasted with the REST path still points to the project.
    [`${URL_OK}/rest/v1/`, URL_OK],
    [`  ${URL_OK}  `, URL_OK],
    ["http://127.0.0.1:54329", "http://127.0.0.1:54329"],
  ])("keeps only the origin of %s", (input, origin) => {
    expect(supabaseOrigin(input)?.origin).toBe(origin);
  });

  it.each([
    undefined,
    "",
    "   ",
    "proyecto.supabase.co",
    "ftp://x.supabase.co",
  ])("is null for %s", (input) => {
    expect(supabaseOrigin(input)).toBeNull();
  });
});

describe("galleryPublicBase", () => {
  it("is the public path of the gallery bucket", () => {
    expect(galleryPublicBase(`${URL_OK}/rest/v1/`)).toBe(BASE);
  });

  it("is null without a URL", () => {
    expect(galleryPublicBase(undefined)).toBeNull();
  });
});

describe("galleryObjectPath", () => {
  it("puts the file in the gallery's folder", () => {
    expect(galleryObjectPath("ashaninka", "2026-11-18-abc123.jpg")).toBe(
      "ashaninka/2026-11-18-abc123.jpg",
    );
  });

  it.each(["../x.jpg", "a/b.jpg", ".hidden.jpg", ""])("refuses %s", (name) => {
    expect(() => galleryObjectPath("ashaninka", name)).toThrow(RangeError);
  });
});

describe("galleryObjectPathOf", () => {
  it("finds the bucket path of an uploaded photo", () => {
    expect(
      galleryObjectPathOf(
        `${BASE}/ashaninka/2026-11-18-abc123.jpg`,
        "ashaninka",
        URL_OK,
      ),
    ).toBe("ashaninka/2026-11-18-abc123.jpg");
  });

  it.each([
    ["a photo of public/", "/peoples/ashaninka/ashaninka-dance.jpg"],
    ["another gallery's folder", `${BASE}/otra/2026-11-18-abc123.jpg`],
    ["a nested path", `${BASE}/ashaninka/sub/x.jpg`],
    ["a climb out of the folder", `${BASE}/ashaninka/../package.json`],
    [
      "another host",
      "https://otro.supabase.co/storage/v1/object/public/gallery/ashaninka/x.jpg",
    ],
  ])("is null for %s", (_, src) => {
    expect(galleryObjectPathOf(src, "ashaninka", URL_OK)).toBeNull();
  });

  it("is null without a Supabase URL", () => {
    expect(
      galleryObjectPathOf(`${BASE}/ashaninka/x.jpg`, "ashaninka", undefined),
    ).toBeNull();
  });
});

describe("galleryRemotePattern (AC-E4-4)", () => {
  it("allows only the gallery bucket of the project", () => {
    expect(galleryRemotePattern(URL_OK)).toEqual({
      protocol: "https",
      hostname: "proyecto.supabase.co",
      port: "",
      pathname: "/storage/v1/object/public/gallery/**",
    });
  });

  it("keeps the port of a local Supabase", () => {
    expect(galleryRemotePattern("http://127.0.0.1:54329")).toMatchObject({
      protocol: "http",
      hostname: "127.0.0.1",
      port: "54329",
    });
  });

  it("is null without a URL, so next.config adds no pattern", () => {
    expect(galleryRemotePattern(undefined)).toBeNull();
  });
});
