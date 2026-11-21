// @vitest-environment node
// Route Handlers run on the server; see photos-route-post.test.ts.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Photo } from "@/lib/peoples";

import {
  credentials,
  fakeGallerySupabase,
  PUBLIC_BASE,
  repoPhotos,
  SECRET_KEY,
  stubAdminEnv,
} from "./fake-gallery-supabase";

vi.mock("server-only", () => ({}));
const revalidateTag = vi.fn();
vi.mock("next/cache", () => ({
  revalidateTag: (...args: unknown[]) => revalidateTag(...args),
  unstable_cache: (fn: () => unknown) => fn,
}));

let fake = fakeGallerySupabase();
let configured = true;
vi.mock("@/lib/supabase-optional", () => ({
  getOptionalSupabase: () => (configured ? fake.client : null),
}));

const { DELETE, PATCH } = await import("@/app/api/admin/fotos/route");

function call(
  handler: typeof PATCH,
  method: "PATCH" | "DELETE",
  body: unknown,
  authorization: string | null = credentials,
) {
  return handler(
    new Request("http://localhost/api/admin/fotos", {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(authorization ? { authorization } : {}),
      },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

const patch = (body: unknown, authorization?: string | null) =>
  call(PATCH, "PATCH", body, authorization);
const remove = (body: unknown, authorization?: string | null) =>
  call(DELETE, "DELETE", body, authorization);

/** A photo uploaded through /admin/fotos: its file is in the bucket. */
const uploaded: Photo = {
  ...repoPhotos[0],
  src: `${PUBLIC_BASE}/ashaninka/2026-11-18-abc123.jpg`,
};
const stored = [repoPhotos[0], repoPhotos[1], uploaded];

const edit = {
  action: "edit",
  version: 2,
  src: repoPhotos[1].src,
  alt: "Mujeres asháninka y yanesha sostienen un hilo en ronda sobre el pasto.",
  caption: "",
  author: "Centro de la Mujer Peruana Flora Tristán",
  license: "CC BY-SA 4.0",
  url: "https://commons.wikimedia.org/wiki/File:Ejemplo.jpg",
};

let consoleInfo: ReturnType<typeof vi.spyOn>;
let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  stubAdminEnv(vi);
  fake = fakeGallerySupabase({ row: { version: 2, photos: stored } });
  configured = true;
  revalidateTag.mockClear();
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  consoleInfo = vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("PATCH and DELETE /api/admin/fotos: access", () => {
  // AC-E1-3: called directly, without the proxy in front.
  it.each([
    ["PATCH", () => patch(edit, null)],
    ["DELETE", () => remove({ version: 2, src: uploaded.src }, null)],
  ])("%s answers 401 without credentials", async (_, send) => {
    const response = await send();

    expect(response.status).toBe(401);
    expect(fake.reads).toHaveLength(0);
  });

  it("answers 503 when Supabase is not configured", async () => {
    configured = false;

    const response = await patch(edit);

    expect(response.status).toBe(503);
    expect((await response.json()).error).toBe("supabase_not_configured");
  });

  it.each([
    ["not JSON", "{"],
    ["no version", { ...edit, version: undefined }],
    ["an unknown action", { ...edit, action: "rotate" }],
    [
      "an unknown direction",
      { action: "move", version: 2, src: uploaded.src, direction: "left" },
    ],
  ])("refuses %s", async (_, body) => {
    const response = await patch(body);

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("photo_invalid");
    expect(fake.saves).toHaveLength(0);
  });
});

describe("PATCH edit", () => {
  it("changes texts and credit, without touching any file", async () => {
    const response = await patch(edit);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      version: 3,
      message: "Cambios guardados. Ya están en la galería.",
    });
    expect(body.photos[1]).toEqual({
      src: repoPhotos[1].src,
      width: repoPhotos[1].width,
      height: repoPhotos[1].height,
      alt: edit.alt,
      credit: { author: edit.author, license: edit.license, url: edit.url },
    });
    expect(body.photos[0]).toEqual(repoPhotos[0]);
    expect(fake.uploads).toHaveLength(0);
    expect(fake.removals).toHaveLength(0);
    expect(revalidateTag).toHaveBeenCalledWith("gallery:ashaninka", "max");
  });

  // AC-E3-4 for edits
  it("refuses a source URL that is not https, with the field marked", async () => {
    const response = await patch({ ...edit, url: "http://example.org" });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(Object.keys(body.fields)).toEqual(["url"]);
    expect(fake.saves).toHaveLength(0);
  });

  it("saves the team's credit and no url when they are left empty", async () => {
    const body = await (
      await patch({ ...edit, author: "", license: "", url: "" })
    ).json();

    expect(body.photos[1].credit).toEqual({
      author: "Living Langs Peru",
      license: "Foto del equipo",
    });
  });

  it("answers 404 for a photo that is no longer there", async () => {
    const response = await patch({ ...edit, src: "/peoples/ashaninka/x.jpg" });

    expect(response.status).toBe(404);
    expect((await response.json()).error).toBe("photo_not_found");
    expect(fake.saves).toHaveLength(0);
  });

  // AC-E3-5
  it("answers version_conflict when someone saved since", async () => {
    const response = await patch({ ...edit, version: 1 });

    expect(response.status).toBe(409);
    expect((await response.json()).error).toBe("version_conflict");
    expect(fake.stored()?.version).toBe(2);
  });
});

describe("PATCH move", () => {
  // AC-E3-7
  it("swaps the photo with its neighbour", async () => {
    const body = await (
      await patch({
        action: "move",
        version: 2,
        src: repoPhotos[1].src,
        direction: "up",
      })
    ).json();

    expect(body.message).toBe("Orden guardado. Ya está en la galería.");
    expect(body.photos.map((photo: Photo) => photo.src)).toEqual([
      repoPhotos[1].src,
      repoPhotos[0].src,
      uploaded.src,
    ]);
  });

  it("explains why the first photo cannot go up", async () => {
    const response = await patch({
      action: "move",
      version: 2,
      src: repoPhotos[0].src,
      direction: "up",
    });

    expect(response.status).toBe(400);
    expect((await response.json()).message).toBe("Ya es la primera foto.");
  });
});

describe("DELETE", () => {
  // AC-E3-6: a photo uploaded to the bucket loses its file too.
  it("removes an uploaded photo from the list and deletes its file", async () => {
    const response = await remove({ version: 2, src: uploaded.src });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toBe("Foto quitada de la galería.");
    expect(body.photos).toEqual([repoPhotos[0], repoPhotos[1]]);
    expect(fake.removals).toEqual([
      { bucket: "gallery", paths: ["ashaninka/2026-11-18-abc123.jpg"] },
    ]);
  });

  // AC-E3-6: a photo of public/ only leaves the list.
  it("removes a repo photo from the list without deleting any file", async () => {
    const body = await (
      await remove({ version: 2, src: repoPhotos[0].src })
    ).json();

    expect(body.photos).toEqual([repoPhotos[1], uploaded]);
    expect(fake.removals).toHaveLength(0);
  });

  it("never deletes a file outside the gallery's folder", async () => {
    const elsewhere: Photo = {
      ...repoPhotos[0],
      src: `${PUBLIC_BASE}/otra-galeria/2026-11-18-abc123.jpg`,
    };
    fake = fakeGallerySupabase({ row: { version: 2, photos: [elsewhere] } });

    await remove({ version: 2, src: elsewhere.src });

    expect(fake.removals).toHaveLength(0);
  });

  it("keeps the save even if deleting the file fails", async () => {
    fake = fakeGallerySupabase({
      row: { version: 2, photos: stored },
      removeError: { code: "500" },
    });

    const response = await remove({ version: 2, src: uploaded.src });

    expect(response.status).toBe(200);
    expect(fake.stored()?.version).toBe(3);
    expect(consoleError).toHaveBeenCalledWith("gallery: delete failed", "500");
  });

  it("answers 404 for an unknown photo and deletes nothing", async () => {
    const response = await remove({ version: 2, src: "/no/existe.jpg" });

    expect(response.status).toBe(404);
    expect(fake.removals).toHaveLength(0);
    expect(fake.saves).toHaveLength(0);
  });

  it("answers 404 without a src", async () => {
    expect((await remove({ version: 2 })).status).toBe(404);
  });

  // AC-E3-10
  it("logs the action and the version, never the key", async () => {
    await remove({ version: 2, src: uploaded.src });

    expect(consoleInfo).toHaveBeenCalledWith("admin/fotos: saved", "remove", 3);
    expect(
      JSON.stringify([consoleInfo.mock.calls, consoleError.mock.calls]),
    ).not.toContain(SECRET_KEY);
  });
});
