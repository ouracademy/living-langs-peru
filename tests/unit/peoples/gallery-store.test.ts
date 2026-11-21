import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  deleteGalleryPhoto,
  readGalleryRow,
  saveGalleryRow,
  uploadGalleryPhoto,
} from "@/lib/peoples/gallery-store";

import {
  fakeGallerySupabase,
  repoPhotos,
} from "../admin/fake-gallery-supabase";

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleError.mockRestore();
});

describe("readGalleryRow", () => {
  it("reads the row of the slug", async () => {
    const fake = fakeGallerySupabase({
      row: { version: 3, photos: repoPhotos },
    });

    expect(await readGalleryRow(fake.client, "ashaninka")).toEqual({
      version: 3,
      photos: repoPhotos,
    });
    expect(fake.reads).toEqual([
      { table: "galleries", filters: [["slug", "ashaninka"]] },
    ]);
  });

  it("is null when the gallery has no row yet", async () => {
    expect(
      await readGalleryRow(fakeGallerySupabase().client, "ashaninka"),
    ).toBeNull();
  });

  // Inside the cache a throw keeps the last good page; a null would not.
  it("throws with the code only when the read fails", async () => {
    const fake = fakeGallerySupabase({
      readError: { code: "42501", message: "permission denied for galleries" },
    });

    await expect(readGalleryRow(fake.client, "ashaninka")).rejects.toThrow(
      "galleries read failed (42501)",
    );
    await expect(readGalleryRow(fake.client, "ashaninka")).rejects.not.toThrow(
      /permission denied/,
    );
  });

  it.each([
    ["a version that is not a number", { version: "3", photos: repoPhotos }],
    ["photos that are not a list", { version: 3, photos: {} }],
    [
      "a photo without credit",
      { version: 3, photos: [{ ...repoPhotos[0], credit: null }] },
    ],
    [
      "a photo without size",
      { version: 3, photos: [{ ...repoPhotos[0], width: 0 }] },
    ],
    [
      "a caption that is not text",
      { version: 3, photos: [{ ...repoPhotos[0], caption: 4 }] },
    ],
    [
      "an empty source url",
      {
        version: 3,
        photos: [
          { ...repoPhotos[0], credit: { author: "a", license: "b", url: "" } },
        ],
      },
    ],
  ])("throws on a row with %s", async (_, row) => {
    const fake = fakeGallerySupabase({
      row: row as { version: number; photos: unknown },
    });

    await expect(readGalleryRow(fake.client, "ashaninka")).rejects.toThrow(
      "malformed",
    );
  });
});

describe("saveGalleryRow", () => {
  it("saves the whole list with the expected version", async () => {
    const fake = fakeGallerySupabase();

    expect(
      await saveGalleryRow(fake.client, "ashaninka", repoPhotos, 0),
    ).toEqual({ ok: true, version: 1 });
    expect(fake.saves).toEqual([
      {
        name: "save_gallery",
        p_slug: "ashaninka",
        p_photos: repoPhotos,
        p_expected_version: 0,
      },
    ]);
  });

  // AC-E3-5
  it("answers version_conflict on 40001", async () => {
    const fake = fakeGallerySupabase({ row: { version: 2, photos: [] } });

    expect(
      await saveGalleryRow(fake.client, "ashaninka", repoPhotos, 1),
    ).toEqual({ ok: false, error: "version_conflict" });
  });

  it("answers gallery_unavailable on any other error, logging the code", async () => {
    const fake = fakeGallerySupabase({ saveError: { code: "XX000" } });

    expect(
      await saveGalleryRow(fake.client, "ashaninka", repoPhotos, 0),
    ).toEqual({ ok: false, error: "gallery_unavailable" });
    expect(consoleError).toHaveBeenCalledWith("gallery: save failed", "XX000");
  });

  it("answers gallery_unavailable when the function returns no version", async () => {
    const fake = fakeGallerySupabase();
    Object.assign(fake.client, {
      rpc: async () => ({ data: null, error: null }),
    });

    expect(
      await saveGalleryRow(fake.client, "ashaninka", repoPhotos, 0),
    ).toEqual({ ok: false, error: "gallery_unavailable" });
  });
});

describe("uploadGalleryPhoto and deleteGalleryPhoto", () => {
  it("uploads a JPEG to the gallery bucket without overwriting", async () => {
    const fake = fakeGallerySupabase();
    const bytes = new Uint8Array([1, 2, 3]);

    expect(
      await uploadGalleryPhoto(fake.client, "ashaninka/a.jpg", bytes),
    ).toBe(true);
    expect(fake.uploads).toEqual([
      {
        bucket: "gallery",
        path: "ashaninka/a.jpg",
        bytes,
        options: {
          contentType: "image/jpeg",
          upsert: false,
          cacheControl: "31536000",
        },
      },
    ]);
  });

  it("reports a failed upload with its code", async () => {
    const fake = fakeGallerySupabase({ uploadError: { code: "409" } });

    expect(
      await uploadGalleryPhoto(
        fake.client,
        "ashaninka/a.jpg",
        new Uint8Array(),
      ),
    ).toBe(false);
    expect(consoleError).toHaveBeenCalledWith("gallery: upload failed", "409");
  });

  it("deletes one file of the gallery bucket", async () => {
    const fake = fakeGallerySupabase();

    expect(await deleteGalleryPhoto(fake.client, "ashaninka/a.jpg")).toBe(true);
    expect(fake.removals).toEqual([
      { bucket: "gallery", paths: ["ashaninka/a.jpg"] },
    ]);
  });

  it("reports a failed delete with its code", async () => {
    const fake = fakeGallerySupabase({ removeError: { code: "500" } });

    expect(await deleteGalleryPhoto(fake.client, "ashaninka/a.jpg")).toBe(
      false,
    );
    expect(consoleError).toHaveBeenCalledWith("gallery: delete failed", "500");
  });
});
