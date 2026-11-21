// @vitest-environment node
// A Route Handler runs on the server: jsdom's FormData and Blob do not
// round-trip through undici's Request the way Node's own classes do.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  credentials,
  fakeGallerySupabase,
  PUBLIC_BASE,
  repoPhotos,
  SECRET_KEY,
  stubAdminEnv,
} from "./fake-gallery-supabase";
import { jpeg, png } from "./jpeg-fixture";

vi.mock("server-only", () => ({}));
const revalidateTag = vi.fn();
vi.mock("next/cache", () => ({
  revalidateTag: (...args: unknown[]) => revalidateTag(...args),
  revalidatePath: () => {
    throw new Error("revalidatePath must never be called (spec #15)");
  },
  unstable_cache: (fn: () => unknown) => fn,
}));

let fake = fakeGallerySupabase();
let configured = true;
vi.mock("@/lib/supabase-optional", () => ({
  getOptionalSupabase: () => (configured ? fake.client : null),
}));

const { POST } = await import("@/app/api/admin/fotos/route");

const validFields = {
  alt: "Tres mujeres asháninka tejen una cushma bajo un techo de palma.",
  caption: "Taller de tejido, 2025.",
  author: "Centro de la Mujer Peruana Flora Tristán",
  license: "CC BY-SA 4.0",
  url: "https://commons.wikimedia.org/wiki/File:Ejemplo.jpg",
};

function form({
  photo = jpeg(2400, 1600) as Uint8Array | null,
  fields = validFields as Record<string, string>,
  version = "0" as string | null,
}: {
  photo?: Uint8Array | null;
  fields?: Record<string, string>;
  version?: string | null;
} = {}): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  if (version !== null) data.set("version", version);
  // Lies on purpose: the server must read the real size from the file.
  data.set("width", "10");
  data.set("height", "10");
  if (photo) {
    data.set(
      "photo",
      new Blob([photo as BlobPart], { type: "image/jpeg" }),
      "IMG_0001.jpeg",
    );
  }
  return data;
}

const post = (body: FormData, authorization: string | null = credentials) =>
  POST(
    new Request("http://localhost/api/admin/fotos", {
      method: "POST",
      headers: authorization ? { authorization } : {},
      body,
    }),
  );

const NEW_PHOTO_PATH = /^ashaninka\/\d{4}-\d{2}-\d{2}-[a-z0-9]{6}\.jpg$/;

let consoleError: ReturnType<typeof vi.spyOn>;
let consoleInfo: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  stubAdminEnv(vi);
  fake = fakeGallerySupabase();
  configured = true;
  revalidateTag.mockClear();
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  consoleInfo = vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/admin/fotos", () => {
  // AC-E1-3: called directly, without the proxy in front.
  it("answers 401 without credentials and never touches Supabase", async () => {
    const response = await post(form(), null);

    expect(response.status).toBe(401);
    expect(fake.reads).toHaveLength(0);
    expect(fake.uploads).toHaveLength(0);
  });

  it("answers 503 when Supabase is not configured", async () => {
    configured = false;

    const response = await post(form());

    expect(response.status).toBe(503);
    expect((await response.json()).error).toBe("supabase_not_configured");
  });

  // AC-E3-1, AC-E3-3: the first save starts from the repo's photos.
  it("uploads the photo and saves the list with it at the end", async () => {
    const photo = jpeg(2400, 1600);

    const response = await post(form({ photo }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      ok: true,
      version: 1,
      message: "Foto guardada. Ya está en la galería.",
    });

    expect(fake.uploads).toHaveLength(1);
    const [upload] = fake.uploads;
    expect(upload.bucket).toBe("gallery");
    expect(upload.path).toMatch(NEW_PHOTO_PATH);
    expect(new Uint8Array(upload.bytes)).toEqual(photo);
    expect(upload.options).toMatchObject({
      contentType: "image/jpeg",
      upsert: false,
    });

    const added = {
      src: `${PUBLIC_BASE}/${upload.path}`,
      width: 2400,
      height: 1600,
      alt: validFields.alt,
      caption: validFields.caption,
      credit: {
        author: validFields.author,
        license: validFields.license,
        url: validFields.url,
      },
    };
    expect(body.photo).toEqual(added);
    expect(body.photos).toEqual([...repoPhotos, added]);
    expect(fake.saves).toEqual([
      {
        name: "save_gallery",
        p_slug: "ashaninka",
        p_photos: [...repoPhotos, added],
        p_expected_version: 0,
      },
    ]);
    expect(fake.stored()).toEqual({
      version: 1,
      photos: [...repoPhotos, added],
    });
  });

  // AC-E3-9: the public page is revalidated by tag, never by path.
  it("revalidates the gallery tag with the max profile", async () => {
    await post(form());

    expect(revalidateTag).toHaveBeenCalledWith("gallery:ashaninka", "max");
  });

  it("appends to the stored list and sends the version it read", async () => {
    fake = fakeGallerySupabase({
      row: { version: 4, photos: [repoPhotos[1]] },
    });

    const body = await (await post(form({ version: "4" }))).json();

    expect(body.version).toBe(5);
    expect(body.photos).toHaveLength(2);
    expect(body.photos[0]).toEqual(repoPhotos[1]);
    expect(fake.saves[0].p_expected_version).toBe(4);
  });

  it("drops an empty caption instead of saving an empty string", async () => {
    const body = await (
      await post(form({ fields: { ...validFields, caption: "  " } }))
    ).json();

    expect(body.photo).not.toHaveProperty("caption");
  });

  // 2026-11-18: only the photo and the description are required.
  it("saves the team's credit and no url when they come empty", async () => {
    const response = await post(
      form({ fields: { ...validFields, author: "", license: " ", url: "" } }),
    );

    expect(response.status).toBe(201);
    expect((await response.json()).photo.credit).toEqual({
      author: "Living Langs Peru",
      license: "Foto del equipo",
    });
  });

  // AC-E3-4
  it.each([
    ["no description", { ...validFields, alt: "" }],
    ["a generic description", { ...validFields, alt: "Foto" }],
    ["an http URL", { ...validFields, url: "http://example.org/x" }],
  ])("refuses %s without uploading or saving", async (_, fields) => {
    const response = await post(form({ fields }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("photo_invalid");
    expect(Object.keys(body.fields)).toHaveLength(1);
    expect(fake.uploads).toHaveLength(0);
    expect(fake.saves).toHaveLength(0);
  });

  it.each([
    ["no photo", null],
    ["a PNG", png(800, 600)],
    ["a photo above 2400 px", jpeg(3000, 2000)],
  ])("refuses %s", async (_, photo) => {
    const response = await post(form({ photo }));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("photo_invalid");
    expect(fake.uploads).toHaveLength(0);
  });

  it.each([
    ["missing", null],
    ["not a number", "dos"],
    ["negative", "-1"],
  ])("refuses a %s version", async (_, version) => {
    const response = await post(form({ version }));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("photo_invalid");
    expect(fake.uploads).toHaveLength(0);
  });

  // AC-E3-5: someone saved after the editor loaded the page.
  it("answers version_conflict without uploading when the version is stale", async () => {
    fake = fakeGallerySupabase({ row: { version: 3, photos: repoPhotos } });

    const response = await post(form({ version: "2" }));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "version_conflict",
      message: "Alguien guardó antes. Recarga y vuelve a intentar.",
    });
    expect(fake.uploads).toHaveLength(0);
    expect(fake.saves).toHaveLength(0);
  });

  // AC-E3-5: someone saved between our read and our save.
  it("deletes the uploaded file when save_gallery answers a conflict", async () => {
    fake = fakeGallerySupabase({ saveError: { code: "40001" } });

    const response = await post(form());

    expect(response.status).toBe(409);
    expect((await response.json()).error).toBe("version_conflict");
    expect(fake.removals).toEqual([
      { bucket: "gallery", paths: [fake.uploads[0].path] },
    ]);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("deletes the uploaded file and answers 502 when the save fails", async () => {
    fake = fakeGallerySupabase({ saveError: { code: "XX000" } });

    const response = await post(form());

    expect(response.status).toBe(502);
    expect((await response.json()).error).toBe("gallery_unavailable");
    expect(fake.removals).toHaveLength(1);
  });

  it("answers 502 and saves nothing when the upload fails", async () => {
    fake = fakeGallerySupabase({ uploadError: { code: "413" } });

    const response = await post(form());

    expect(response.status).toBe(502);
    expect((await response.json()).error).toBe("gallery_unavailable");
    expect(fake.saves).toHaveLength(0);
  });

  it("answers gallery_full when there are already 24 photos", async () => {
    fake = fakeGallerySupabase({
      row: {
        version: 1,
        photos: Array.from({ length: 24 }, (_, index) => ({
          ...repoPhotos[0],
          src: `/peoples/ashaninka/foto-${index}.jpg`,
        })),
      },
    });

    const response = await post(form({ version: "1" }));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("gallery_full");
    expect(fake.uploads).toHaveLength(0);
  });

  it("answers 502 when the gallery cannot be read", async () => {
    fake = fakeGallerySupabase({ readError: { code: "08006" } });

    const response = await post(form());

    expect(response.status).toBe(502);
    expect((await response.json()).error).toBe("gallery_unavailable");
  });

  // AC-E3-10
  it("logs the action and the version, never the key or the credentials", async () => {
    await post(form());

    const logged = JSON.stringify([
      consoleInfo.mock.calls,
      consoleError.mock.calls,
    ]);
    expect(consoleInfo).toHaveBeenCalledWith("admin/fotos: saved", "add", 1);
    expect(logged).not.toContain(SECRET_KEY);
    expect(logged).not.toContain("clave-de-prueba");
    expect(logged).not.toContain(validFields.author);
  });
});
