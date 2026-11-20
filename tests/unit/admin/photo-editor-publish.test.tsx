import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Photo } from "@/lib/peoples";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

vi.mock("@/components/admin/resize-image", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/components/admin/resize-image")>()),
  resizeToJpeg: vi.fn(async () => ({
    ok: true,
    photo: {
      blob: new Blob(["jpeg"], { type: "image/jpeg" }),
      width: 2400,
      height: 1600,
    },
  })),
}));

const { PhotoEditor } = await import("@/components/admin/photo-editor");

const photos = (
  JSON.parse(
    readFileSync(
      join(process.cwd(), "src/data/peoples/ashaninka.json"),
      "utf8",
    ),
  ).photos as Photo[]
).slice(0, 2);

const added: Photo = {
  src: "https://proyecto-prueba.supabase.co/storage/v1/object/public/gallery/ashaninka/2026-11-18-abc123.jpg",
  width: 2400,
  height: 1600,
  alt: "Tres mujeres asháninka tejen una cushma bajo un techo de palma.",
  credit: { author: "Living Langs Peru", license: "Foto del equipo" },
};

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  Object.assign(URL, {
    createObjectURL: vi.fn(() => "blob:preview"),
    revokeObjectURL: vi.fn(),
  });
  fetchMock = vi.fn(async () =>
    Response.json(
      {
        ok: true,
        version: 4,
        photos: [...photos, added],
        photo: added,
        message: "Foto guardada. Ya está en la galería.",
      },
      { status: 201 },
    ),
  );
  vi.stubGlobal("fetch", fetchMock);
  render(<PhotoEditor photos={photos} version={3} />);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

async function addPhoto() {
  fireEvent.click(screen.getByRole("button", { name: "Agregar foto" }));
  fireEvent.change(screen.getByLabelText(/Elige una foto/), {
    target: { files: [new File(["x"], "a.jpg", { type: "image/jpeg" })] },
  });
  await screen.findByText(/Se guardará así/);
  fireEvent.change(
    screen.getByLabelText("Descripción (para quien no ve la foto)"),
    { target: { value: added.alt } },
  );
  fireEvent.click(screen.getByRole("button", { name: "Guardar foto" }));
  await screen.findByText(/Foto guardada/);
}

describe("after adding a photo", () => {
  // UI-10, simplified: the saved photo is served from the bucket right away.
  it("lists the new photo from its stored address, with no local copy", async () => {
    await addPhoto();

    const gallery = screen.getByRole("list", { name: "Fotos de la galería" });
    const row = within(gallery).getAllByRole("listitem")[2];
    expect(row.querySelector("img")?.getAttribute("src")).toContain(
      encodeURIComponent(added.src),
    );
    expect(screen.queryByText("Publicando…")).toBeNull();
    expect(screen.getByText("3 de 24 fotos")).toBeTruthy();
    // The panel closed and released its preview.
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview");
  });

  // UI-9, simplified: saving publishes, so the notice says it is done.
  it("says the photo is in the gallery and links to it", async () => {
    await addPhoto();

    const status = screen.getByRole("status");
    expect(status.textContent).toContain(
      "Foto guardada. Ya está en la galería.",
    );
    expect(
      within(status)
        .getByRole("link", { name: "Ver la galería" })
        .getAttribute("href"),
    ).toBe("/ashaninka#galeria");
    expect(status.textContent).not.toContain("1–2 min");
    expect(document.activeElement).toBe(status);
  });

  it("sends the version it read and adopts the new one", async () => {
    await addPhoto();

    const body = fetchMock.mock.calls[0][1].body as FormData;
    expect(body.get("version")).toBe("3");
    expect(body.has("sha")).toBe(false);
    expect(refresh).toHaveBeenCalled();
  });
});
