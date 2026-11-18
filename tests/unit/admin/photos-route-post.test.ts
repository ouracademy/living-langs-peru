// @vitest-environment node
// A Route Handler runs on the server: jsdom's FormData and Blob do not
// round-trip through undici's Request the way Node's own classes do.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/admin/fotos/route";

import {
  BASE,
  credentials,
  decodeBlob,
  fakeGitHub,
  gallery,
  NEW_COMMIT,
  stubAdminEnv,
  TOKEN,
} from "./fake-github-api";
import { jpeg, png } from "./jpeg-fixture";

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
  sha = BASE,
}: {
  photo?: Uint8Array | null;
  fields?: Record<string, string>;
  sha?: string;
} = {}): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  data.set("sha", sha);
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

let consoleError: ReturnType<typeof vi.spyOn>;
let consoleInfo: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  stubAdminEnv();
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  consoleInfo = vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("POST /api/admin/fotos", () => {
  // AC-E1-3: called directly, without the proxy in front.
  it("answers 401 without credentials and never calls GitHub", async () => {
    const { fetchMock } = fakeGitHub();
    vi.stubGlobal("fetch", fetchMock);

    const response = await post(form(), null);

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("answers 503 without a token: a save could never land", async () => {
    vi.stubEnv("GITHUB_TOKEN", "");
    const { fetchMock } = fakeGitHub();
    vi.stubGlobal("fetch", fetchMock);

    const response = await post(form());

    expect(response.status).toBe(503);
    expect((await response.json()).error).toBe("github_not_configured");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // AC-E3-1, AC-E3-3
  it("commits the image and the JSON together, with the real dimensions", async () => {
    const { fetchMock, calls } = fakeGitHub();
    vi.stubGlobal("fetch", fetchMock);
    const photo = jpeg(2400, 1600);

    const response = await post(form({ photo }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      ok: true,
      sha: NEW_COMMIT,
      message: "Foto guardada. Se verá en la web en 1–2 minutos.",
    });
    expect(body.photo.src).toMatch(
      /^\/peoples\/ashaninka\/\d{4}-\d{2}-\d{2}-[a-z0-9]{6}\.jpg$/,
    );

    const blobs = calls.filter((call) => call.url.endsWith("/git/blobs"));
    expect(blobs).toHaveLength(2);
    expect(new Uint8Array(decodeBlob(blobs[0]))).toEqual(photo);

    const written = JSON.parse(decodeBlob(blobs[1]).toString("utf8"));
    const added = written.photos.at(-1);
    expect(written.photos).toHaveLength(JSON.parse(gallery).photos.length + 1);
    expect(added).toEqual({
      src: body.photo.src,
      width: 2400,
      height: 1600,
      alt: validFields.alt,
      caption: validFields.caption,
      credit: {
        author: validFields.author,
        license: validFields.license,
        url: validFields.url,
      },
    });

    const tree = calls.find((call) => call.url.endsWith("/git/trees"));
    expect(
      (tree?.body.tree as { path: string }[]).map((entry) => entry.path),
    ).toEqual([`public${body.photo.src}`, "src/data/peoples/ashaninka.json"]);

    const commit = calls.find(
      (call) => call.method === "POST" && call.url.endsWith("/git/commits"),
    );
    expect(commit?.body).toMatchObject({
      message: "chore: update ashaninka gallery (add photo)",
      parents: [BASE],
    });
    expect(calls.filter((call) => call.method === "PATCH")).toHaveLength(1);
  });

  it("drops an empty caption instead of writing an empty string", async () => {
    const { fetchMock, calls } = fakeGitHub();
    vi.stubGlobal("fetch", fetchMock);

    await post(form({ fields: { ...validFields, caption: "  " } }));

    const blobs = calls.filter((call) => call.url.endsWith("/git/blobs"));
    const written = JSON.parse(decodeBlob(blobs[1]).toString("utf8"));
    expect(written.photos.at(-1)).not.toHaveProperty("caption");
  });

  // AC-E3-4
  it.each([
    ["no description", { ...validFields, alt: "" }],
    ["a generic description", { ...validFields, alt: "Foto" }],
    ["no author", { ...validFields, author: "" }],
    ["no license", { ...validFields, license: "" }],
    ["an http URL", { ...validFields, url: "http://example.org/x" }],
  ])("refuses %s without touching GitHub", async (_, fields) => {
    const { fetchMock } = fakeGitHub();
    vi.stubGlobal("fetch", fetchMock);

    const response = await post(form({ fields }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("photo_invalid");
    expect(Object.keys(body.fields)).toHaveLength(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["no photo", null],
    ["a PNG", png(800, 600)],
    ["a photo above 2400 px", jpeg(3000, 2000)],
  ])("refuses %s", async (_, photo) => {
    const { fetchMock } = fakeGitHub();
    vi.stubGlobal("fetch", fetchMock);

    const response = await post(form({ photo }));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("photo_invalid");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a missing or malformed sha", async () => {
    vi.stubGlobal("fetch", fakeGitHub().fetchMock);

    const response = await post(form({ sha: "main" }));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("photo_invalid");
  });

  // AC-E3-5: the branch moved after the editor loaded the page.
  it("answers version_conflict without writing when the branch moved", async () => {
    const { fetchMock, calls } = fakeGitHub({ head: "f".repeat(40) });
    vi.stubGlobal("fetch", fetchMock);

    const response = await post(form());
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({
      error: "version_conflict",
      message: "Alguien guardó antes. Recarga y vuelve a intentar.",
    });
    expect(calls.some((call) => call.method !== "GET")).toBe(false);
  });

  // AC-E3-5: someone pushed between our read and our ref update.
  it("answers version_conflict when GitHub refuses the fast forward", async () => {
    vi.stubGlobal("fetch", fakeGitHub({ refStatus: 422 }).fetchMock);

    const response = await post(form());

    expect(response.status).toBe(409);
    expect((await response.json()).error).toBe("version_conflict");
  });

  it("answers gallery_full when there are already 24 photos", async () => {
    const full = JSON.parse(gallery);
    full.photos = Array.from({ length: 24 }, (_, index) => ({
      ...full.photos[0],
      src: `/peoples/ashaninka/foto-${index}.jpg`,
    }));
    vi.stubGlobal(
      "fetch",
      fakeGitHub({ file: JSON.stringify(full) }).fetchMock,
    );

    const response = await post(form());

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("gallery_full");
  });

  it("answers gallery_unreadable when the file is not a gallery", async () => {
    vi.stubGlobal("fetch", fakeGitHub({ file: "not json" }).fetchMock);

    const response = await post(form());

    expect(response.status).toBe(502);
    expect((await response.json()).error).toBe("gallery_unreadable");
  });

  it("answers 502 when GitHub is down", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );

    const response = await post(form());

    expect(response.status).toBe(502);
    expect((await response.json()).error).toBe("github_unavailable");
  });

  // AC-E3-10
  it("logs the action and the commit, never the token or the credentials", async () => {
    vi.stubGlobal("fetch", fakeGitHub().fetchMock);

    await post(form());

    const logged = JSON.stringify([
      consoleInfo.mock.calls,
      consoleError.mock.calls,
    ]);
    expect(consoleInfo).toHaveBeenCalledWith(
      "admin/fotos: saved",
      "add",
      NEW_COMMIT,
    );
    expect(logged).not.toContain(TOKEN);
    expect(logged).not.toContain("clave-de-prueba");
    expect(logged).not.toContain(validFields.author);
  });

  it("logs only the error code when the save fails", async () => {
    vi.stubGlobal("fetch", fakeGitHub({ refStatus: 422 }).fetchMock);

    await post(form());

    expect(consoleError).toHaveBeenCalledWith(
      "admin/fotos: save failed",
      "add",
      "version_conflict",
    );
  });
});
