// @vitest-environment node
// Route Handlers run on the server; see photos-route-post.test.ts.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE, PATCH } from "@/app/api/admin/fotos/route";
import type { Photo } from "@/lib/peoples";

import {
  BASE,
  type Call,
  credentials,
  decodeBlob,
  fakeGitHub,
  gallery,
  NEW_COMMIT,
  stubAdminEnv,
  TOKEN,
} from "./fake-github-api";

const photos = JSON.parse(gallery).photos as Photo[];

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

const edit = {
  action: "edit",
  sha: BASE,
  src: photos[1].src,
  alt: "Mujeres asháninka y yanesha sostienen un hilo en ronda sobre el pasto.",
  caption: "",
  author: "Centro de la Mujer Peruana Flora Tristán",
  license: "CC BY-SA 4.0",
  url: "https://commons.wikimedia.org/wiki/File:Ejemplo.jpg",
};

/** The JSON the save committed. */
function writtenGallery(calls: Call[]): { photos: Photo[] } {
  const blobs = calls.filter((c) => c.url.endsWith("/git/blobs"));
  return JSON.parse(decodeBlob(blobs.at(-1) as Call).toString("utf8"));
}

function treeOf(calls: Call[]) {
  return calls.find((c) => c.url.endsWith("/git/trees"))?.body.tree as {
    path: string;
    sha: string | null;
  }[];
}

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

describe("PATCH and DELETE /api/admin/fotos: access", () => {
  // AC-E1-3: called directly, without the proxy in front.
  it.each([
    ["PATCH", () => patch(edit, null)],
    ["DELETE", () => remove({ sha: BASE, src: photos[0].src }, null)],
  ])("%s answers 401 without credentials", async (_, send) => {
    const { fetchMock } = fakeGitHub();
    vi.stubGlobal("fetch", fetchMock);

    expect((await send()).status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("answers 503 without a token", async () => {
    vi.stubEnv("GITHUB_TOKEN", "");
    vi.stubGlobal("fetch", fakeGitHub().fetchMock);

    expect((await remove({ sha: BASE, src: photos[0].src })).status).toBe(503);
  });

  it.each([
    ["not JSON", "{"],
    ["an array", "[]"],
    ["no sha", { src: photos[0].src, action: "move", direction: "up" }],
    ["an unknown action", { sha: BASE, src: photos[0].src, action: "rotar" }],
    [
      "an unknown direction",
      { sha: BASE, src: photos[2].src, action: "move", direction: "left" },
    ],
  ])("refuses %s without writing", async (_, body) => {
    const { fetchMock } = fakeGitHub();
    vi.stubGlobal("fetch", fetchMock);

    const response = await patch(body);

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("photo_invalid");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("PATCH edit", () => {
  it("changes texts and credit in one commit, without touching the file", async () => {
    const { fetchMock, calls } = fakeGitHub();
    vi.stubGlobal("fetch", fetchMock);

    const response = await patch(edit);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      sha: NEW_COMMIT,
      message: "Cambios guardados. Se verán en la web en 1–2 minutos.",
    });
    expect(treeOf(calls).map((entry) => entry.path)).toEqual([
      "src/data/peoples/ashaninka.json",
    ]);
    const after = writtenGallery(calls).photos[1];
    expect(after).toEqual({
      src: photos[1].src,
      width: photos[1].width,
      height: photos[1].height,
      alt: edit.alt,
      credit: { author: edit.author, license: edit.license, url: edit.url },
    });
    expect(body.photos[1]).toEqual(after);
    expect(
      calls.find((c) => c.method === "POST" && c.url.endsWith("/git/commits"))
        ?.body.message,
    ).toBe("chore: update ashaninka gallery (edit photo)");
  });

  // AC-E3-4 for edits
  it("refuses a source URL that is not https, with the field marked", async () => {
    const { fetchMock } = fakeGitHub();
    vi.stubGlobal("fetch", fetchMock);

    const response = await patch({ ...edit, url: "http://example.org/x" });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(Object.keys(body.fields)).toEqual(["url"]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // 2026-11-18: author and license fall back to the team's credit, and the
  // URL is optional: without one, the credit has no `url` key at all.
  it("writes the team's credit and no url when they are left empty", async () => {
    const { fetchMock, calls } = fakeGitHub();
    vi.stubGlobal("fetch", fetchMock);

    const response = await patch({
      ...edit,
      author: " ",
      license: "",
      url: "",
    });

    expect(response.status).toBe(200);
    const written = writtenGallery(calls).photos.find(
      (photo) => photo.src === edit.src,
    );
    expect(written?.credit).toEqual({
      author: "Living Langs Peru",
      license: "Foto del equipo",
    });
  });

  it("answers 404 for a photo that is no longer there", async () => {
    vi.stubGlobal("fetch", fakeGitHub().fetchMock);

    const response = await patch({
      ...edit,
      src: "/peoples/ashaninka/no-existe.jpg",
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: "photo_not_found",
      message: "Esa foto ya no está en la galería. Recarga la página.",
    });
  });

  // AC-E3-5
  it("answers version_conflict when the branch moved", async () => {
    const { fetchMock, calls } = fakeGitHub({ head: "f".repeat(40) });
    vi.stubGlobal("fetch", fetchMock);

    const response = await patch(edit);

    expect(response.status).toBe(409);
    expect(calls.some((c) => c.method !== "GET")).toBe(false);
  });
});

describe("PATCH move", () => {
  // AC-E3-7
  it("swaps the photo with its neighbour in one commit", async () => {
    const { fetchMock, calls } = fakeGitHub();
    vi.stubGlobal("fetch", fetchMock);

    const response = await patch({
      action: "move",
      sha: BASE,
      src: photos[2].src,
      direction: "up",
    });

    expect(response.status).toBe(200);
    expect((await response.json()).message).toBe(
      "Orden guardado. Se verá en la web en 1–2 minutos.",
    );
    expect(writtenGallery(calls).photos.map((p) => p.src)).toEqual([
      photos[0].src,
      photos[2].src,
      photos[1].src,
      ...photos.slice(3).map((p) => p.src),
    ]);
  });

  it("explains why the first photo cannot go up", async () => {
    const { fetchMock, calls } = fakeGitHub();
    vi.stubGlobal("fetch", fetchMock);

    const response = await patch({
      action: "move",
      sha: BASE,
      src: photos[0].src,
      direction: "up",
    });

    expect(response.status).toBe(400);
    expect((await response.json()).message).toBe("Ya es la primera foto.");
    expect(calls.some((c) => c.method !== "GET")).toBe(false);
  });
});

describe("DELETE", () => {
  // AC-E3-6: entry and file go in the same commit.
  it("removes the entry and deletes the file in one commit", async () => {
    const { fetchMock, calls } = fakeGitHub();
    vi.stubGlobal("fetch", fetchMock);
    const target = photos[4];

    const response = await remove({ sha: BASE, src: target.src });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toBe(
      "Foto quitada. Se verá en la web en 1–2 minutos.",
    );
    expect(treeOf(calls)).toEqual([
      expect.objectContaining({ path: "src/data/peoples/ashaninka.json" }),
      expect.objectContaining({ path: `public${target.src}`, sha: null }),
    ]);
    expect(writtenGallery(calls).photos).toHaveLength(photos.length - 1);
    expect(calls.filter((c) => c.method === "PATCH")).toHaveLength(1);
    expect(
      calls.find((c) => c.method === "POST" && c.url.endsWith("/git/commits"))
        ?.body.message,
    ).toBe("chore: update ashaninka gallery (remove photo)");
  });

  it("answers 404 for an unknown photo and deletes nothing", async () => {
    const { fetchMock, calls } = fakeGitHub();
    vi.stubGlobal("fetch", fetchMock);

    const response = await remove({
      sha: BASE,
      src: "/peoples/ashaninka/no-existe.jpg",
    });

    expect(response.status).toBe(404);
    expect(calls.some((c) => c.method !== "GET")).toBe(false);
  });

  it("answers 404 without a src", async () => {
    vi.stubGlobal("fetch", fakeGitHub().fetchMock);

    expect((await remove({ sha: BASE })).status).toBe(404);
  });

  // AC-E3-10
  it("logs the action and the commit, never the token", async () => {
    vi.stubGlobal("fetch", fakeGitHub().fetchMock);

    await remove({ sha: BASE, src: photos[4].src });

    expect(consoleInfo).toHaveBeenCalledWith(
      "admin/fotos: saved",
      "remove",
      NEW_COMMIT,
    );
    expect(
      JSON.stringify([consoleInfo.mock.calls, consoleError.mock.calls]),
    ).not.toContain(TOKEN);
  });
});
