import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  act,
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

// The watch itself is tested on its own; here the test says when it answers.
let announce: ((state: "waiting" | "published" | "slow") => void) | null = null;
const watched: string[] = [];
vi.mock("@/lib/admin/publish-watch", () => ({
  watchPublication: (
    src: string,
    { onChange }: { onChange: typeof announce },
  ) => {
    watched.push(src);
    announce = onChange;
    return () => {};
  },
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
  src: "/peoples/ashaninka/2026-11-18-abc123.jpg",
  width: 2400,
  height: 1600,
  alt: "Tres mujeres asháninka tejen una cushma bajo un techo de palma.",
  credit: { author: "Living Langs Peru", license: "Foto del equipo" },
};

beforeEach(() => {
  announce = null;
  watched.length = 0;
  Object.assign(URL, {
    createObjectURL: vi.fn(() => "blob:preview"),
    revokeObjectURL: vi.fn(),
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json(
        {
          ok: true,
          sha: "b".repeat(40),
          photos: [...photos, added],
          photo: added,
          message: "Foto guardada. Se verá en la web en 1–2 minutos.",
        },
        { status: 201 },
      ),
    ),
  );
  render(<PhotoEditor photos={photos} sha={"a".repeat(40)} />);
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
  // UI-10
  it("shows the editor's own copy, marked «Publicando…»", async () => {
    await addPhoto();

    const gallery = screen.getByRole("list", { name: "Fotos de la galería" });
    const row = within(gallery).getAllByRole("listitem")[2];
    expect(within(row).getByText("Publicando…")).toBeTruthy();
    expect(row.querySelector("img")?.getAttribute("src")).toBe("blob:preview");
    expect(screen.getByText("3 de 24 fotos")).toBeTruthy();
  });

  // UI-9, UI-8
  it("watches the new file and says when the web shows it", async () => {
    await addPhoto();

    expect(watched).toEqual([added.src]);
    const status = screen.getByRole("status");
    expect(status.textContent).toContain("Publicando en la web");
    expect(document.activeElement).toBe(status);

    act(() => announce?.("published"));

    expect(status.textContent).toContain("Ya se ve en la web.");
    expect(screen.queryByText("Publicando…")).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview");
  });

  it("says it is slow after the wait runs out", async () => {
    await addPhoto();

    act(() => announce?.("slow"));

    expect(screen.getByRole("status").textContent).toContain(
      "Tarda más de lo normal",
    );
  });
});
