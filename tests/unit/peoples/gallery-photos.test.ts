import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Photo } from "@/lib/peoples";

import {
  fakeGallerySupabase,
  repoPhotos,
} from "../admin/fake-gallery-supabase";

vi.mock("server-only", () => ({}));

// unstable_cache needs Next's incremental cache; here it only has to show what
// it was called with and run the function.
const cacheCalls: { keyParts: string[]; options: unknown }[] = [];
vi.mock("next/cache", () => ({
  unstable_cache:
    (fn: () => Promise<unknown>, keyParts: string[], options: unknown) =>
    () => {
      cacheCalls.push({ keyParts, options });
      return fn();
    },
}));

let fake: ReturnType<typeof fakeGallerySupabase> | null = null;
vi.mock("@/lib/supabase-optional", () => ({
  getOptionalSupabase: () => fake?.client ?? null,
}));

const { galleryPhase, galleryTag, getGalleryPhotos } =
  await import("@/lib/peoples/gallery-photos");

const stored: Photo[] = [repoPhotos[2], repoPhotos[0]];
let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  cacheCalls.length = 0;
  fake = fakeGallerySupabase();
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleError.mockRestore();
});

describe("getGalleryPhotos", () => {
  // AC-E4-1
  it("shows the repo's photos when Supabase is not configured", async () => {
    fake = null;

    expect(await getGalleryPhotos("ashaninka", repoPhotos)).toBe(repoPhotos);
    expect(cacheCalls).toHaveLength(0);
  });

  it("shows the repo's photos while the gallery has no row", async () => {
    expect(await getGalleryPhotos("ashaninka", repoPhotos)).toBe(repoPhotos);
  });

  // AC-E4-2
  it("shows the stored photos, cached under the gallery's tag", async () => {
    fake = fakeGallerySupabase({ row: { version: 5, photos: stored } });

    expect(await getGalleryPhotos("ashaninka", repoPhotos)).toEqual(stored);
    expect(cacheCalls).toEqual([
      {
        keyParts: ["gallery", "ashaninka"],
        options: { tags: ["gallery:ashaninka"], revalidate: 3600 },
      },
    ]);
  });

  // AC-E4-3: neither the build nor dev depends on Supabase.
  it.each(["build", "development"] as const)(
    "falls back to the repo's photos when the read fails during %s",
    async (phase) => {
      fake = fakeGallerySupabase({ readError: { code: "08006" } });

      expect(await getGalleryPhotos("ashaninka", repoPhotos, phase)).toBe(
        repoPhotos,
      );
      expect(consoleError).toHaveBeenCalledWith(
        "gallery: read failed, showing the repo photos",
        "galleries read failed (08006)",
      );
    },
  );

  // AC-E4-3: in production a throw keeps the last good page.
  it("throws when the read fails in production", async () => {
    fake = fakeGallerySupabase({ readError: { code: "08006" } });

    await expect(
      getGalleryPhotos("ashaninka", repoPhotos, "production"),
    ).rejects.toThrow("galleries read failed (08006)");
  });
});

describe("galleryPhase", () => {
  it.each([
    [{ NEXT_PHASE: "phase-production-build", NODE_ENV: "production" }, "build"],
    [{ NODE_ENV: "production" }, "production"],
    [{ NODE_ENV: "development" }, "development"],
    [{ NODE_ENV: "test" }, "development"],
  ])("%o is %s", (env, phase) => {
    expect(galleryPhase(env)).toBe(phase);
  });
});

describe("galleryTag", () => {
  it("is per gallery", () => {
    expect(galleryTag("ashaninka")).toBe("gallery:ashaninka");
  });
});
