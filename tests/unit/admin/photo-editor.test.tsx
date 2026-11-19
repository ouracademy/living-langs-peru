import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const resizeToJpeg = vi.fn();
vi.mock("@/components/admin/resize-image", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/components/admin/resize-image")>()),
  resizeToJpeg,
}));

const { PhotoEditor } = await import("@/components/admin/photo-editor");

const SHA = "a".repeat(40);
const DESCRIPTION = "Descripción (para quien no ve la foto)";
const ALT = "Tres mujeres asháninka tejen una cushma bajo un techo de palma.";

const openPanel = () =>
  fireEvent.click(screen.getByRole("button", { name: "Agregar foto" }));

async function choosePhoto() {
  fireEvent.change(screen.getByLabelText(/Elige una foto/), {
    target: {
      files: [new File(["x"], "IMG_0001.jpeg", { type: "image/jpeg" })],
    },
  });
  await screen.findByText(/Se guardará así/);
}

const describePhoto = (value = ALT) =>
  fireEvent.change(screen.getByLabelText(DESCRIPTION), { target: { value } });

const save = () =>
  fireEvent.click(screen.getByRole("button", { name: "Guardar foto" }));

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  // jsdom has no blob URLs; the preview only needs a string to show.
  Object.assign(URL, {
    createObjectURL: vi.fn(() => "blob:preview"),
    revokeObjectURL: vi.fn(),
  });
  resizeToJpeg.mockResolvedValue({
    ok: true,
    photo: {
      blob: new Blob(["jpeg"], { type: "image/jpeg" }),
      width: 2400,
      height: 1600,
    },
  });
  render(<PhotoEditor photos={[]} sha={SHA} />);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("the panel (UI-1, UI-2)", () => {
  it("counts the photos and opens above the list with the focus on its title", () => {
    expect(screen.getByText("0 de 24 fotos")).toBeTruthy();
    expect(screen.getByText(/no tiene fotos todavía/)).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Agregar foto" })).toBeNull();

    openPanel();

    const title = screen.getByRole("heading", { name: "Agregar foto" });
    expect(document.activeElement).toBe(title);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(
      screen
        .getByRole("button", { name: "Agregar foto" })
        .getAttribute("aria-expanded"),
    ).toBe("true");
  });

  it("closes with «Cancelar» and gives the focus back", async () => {
    openPanel();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("heading", { name: "Agregar foto" })).toBeNull();
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Agregar foto" }),
      ),
    );
  });

  it("prefills the team's credit and leaves the source URL empty", () => {
    openPanel();

    expect((screen.getByLabelText("Autor") as HTMLInputElement).value).toBe(
      "Living Langs Peru",
    );
    expect((screen.getByLabelText("Licencia") as HTMLInputElement).value).toBe(
      "Foto del equipo",
    );
    expect(
      (screen.getByLabelText(/Dirección de origen/) as HTMLInputElement).value,
    ).toBe("");
  });
});

describe("Agregar foto", () => {
  beforeEach(openPanel);

  // Only the photo and its description are required (2026-11-18).
  it("asks only for the photo and the description, with a summary", async () => {
    fireEvent.change(screen.getByLabelText("Autor"), { target: { value: "" } });
    save();

    const summary = await screen.findByRole("group", {
      name: "Revisa 2 campos",
    });
    expect(screen.getAllByText("Elige una foto.").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Escribe una descripción de la foto.").length,
    ).toBeGreaterThan(0);
    expect(screen.getByLabelText("Autor").getAttribute("aria-invalid")).toBe(
      null,
    );
    await waitFor(() => expect(document.activeElement).toBe(summary));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(resizeToJpeg).not.toHaveBeenCalled();
  });

  it("focuses the one field when it is the only problem (UI-13)", async () => {
    await choosePhoto();
    save();

    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByLabelText(DESCRIPTION)),
    );
    expect(screen.queryByRole("group", { name: /Revisa/ })).toBeNull();
  });

  it("refuses a generic description before uploading", async () => {
    await choosePhoto();
    describePhoto("Foto");
    save();

    expect(await screen.findByText(/demasiado genérica/)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a source URL that is not https", async () => {
    await choosePhoto();
    describePhoto();
    fireEvent.change(screen.getByLabelText(/Dirección de origen/), {
      target: { value: "http://example.org/x" },
    });
    save();

    expect(await screen.findByText(/tiene que empezar con https/)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // UI-4: the photo is reduced as soon as it is chosen, and shown that way.
  it("shows the reduced photo with its final size and the GPS note", async () => {
    await choosePhoto();

    expect(resizeToJpeg).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/2400 × 1600 px/)).toBeTruthy();
    expect(screen.getByText(/datos de ubicación \(GPS\)/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Cambiar foto" }));
    expect(screen.getByLabelText(/Elige una foto/)).toBeTruthy();
  });

  // AC-E3-1: what is sent is the reduced JPEG, the fields and the sha.
  it("sends the photo, the description, the team's credit and the sha", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        {
          ok: true,
          message: "Foto guardada. Se verá en la web en 1–2 minutos.",
        },
        { status: 201 },
      ),
    );
    await choosePhoto();
    describePhoto();
    save();

    expect(
      await screen.findByText(/Foto guardada\. Se verá en la web/),
    ).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/admin/fotos");
    expect(init.method).toBe("POST");
    const body = init.body as FormData;
    expect(body.get("sha")).toBe(SHA);
    expect(body.get("alt")).toBe(ALT);
    expect(body.get("author")).toBe("Living Langs Peru");
    expect(body.get("license")).toBe("Foto del equipo");
    expect(body.get("url")).toBe("");
    expect((body.get("photo") as File).type).toBe("image/jpeg");
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("link", { name: "Ver la galería" }).getAttribute("href"),
    ).toBe("/ashaninka#galeria");
    // The panel closes once the photo is saved.
    expect(screen.queryByRole("heading", { name: "Agregar foto" })).toBeNull();
  });

  // UI-6
  it("fills the license from a suggestion", async () => {
    fireEvent.click(screen.getByRole("button", { name: "CC BY-SA 4.0" }));

    const license = screen.getByLabelText("Licencia") as HTMLInputElement;
    expect(license.value).toBe("CC BY-SA 4.0");
    expect(document.activeElement).toBe(license);
    expect(
      screen
        .getByRole("button", { name: "CC BY-SA 4.0" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });

  // UI-7: the caption and credit as the public gallery shows them.
  it("previews the credit without a link until there is a valid URL", async () => {
    await choosePhoto();
    const preview = screen.getByRole("region", {
      name: "Así se verá en la galería",
    });
    expect(preview.textContent).toContain(
      "Living Langs Peru · Foto del equipo",
    );
    expect(preview.querySelector("a")).toBeNull();

    fireEvent.change(screen.getByLabelText(/Dirección de origen/), {
      target: { value: "https://commons.wikimedia.org/wiki/File:X.jpg" },
    });
    expect(preview.querySelector("a")?.getAttribute("href")).toBe(
      "https://commons.wikimedia.org/wiki/File:X.jpg",
    );
  });

  // AC-E3-5, UI-12
  it("explains a conflict, offers a reload and keeps what the editor typed", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        {
          error: "version_conflict",
          message: "Alguien guardó antes. Recarga y vuelve a intentar.",
        },
        { status: 409 },
      ),
    );
    await choosePhoto();
    describePhoto();
    save();

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Alguien guardó un cambio mientras editabas.",
    );
    expect(refresh).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Recargar la lista" }));
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(
      (screen.getByLabelText(DESCRIPTION) as HTMLTextAreaElement).value,
    ).toBe(ALT);
    expect(screen.getByText(/Se guardará así/)).toBeTruthy();
  });

  it("shows the server's field problems next to each field", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        {
          error: "photo_invalid",
          message: "Revisa la foto y los campos marcados.",
          fields: { license: "La licencia puede tener hasta 120 caracteres." },
        },
        { status: 400 },
      ),
    );
    await choosePhoto();
    describePhoto();
    save();

    await waitFor(() =>
      expect(
        screen.getByLabelText("Licencia").getAttribute("aria-invalid"),
      ).toBe("true"),
    );
    expect(screen.getByRole("alert").textContent).toBe(
      "Revisa la foto y los campos marcados.",
    );
  });

  it("says so as soon as the photo cannot be reduced, without uploading", async () => {
    resizeToJpeg.mockResolvedValue({ ok: false, problem: "unreadable" });
    fireEvent.change(screen.getByLabelText(/Elige una foto/), {
      target: { files: [new File(["x"], "raro.jpg", { type: "image/jpeg" })] },
    });

    expect((await screen.findByRole("alert")).textContent).toBe(
      "No pudimos leer la foto. Prueba con otra.",
    );
    describePhoto();
    save();
    expect((await screen.findByRole("alert")).textContent).toBe(
      "No pudimos leer la foto. Prueba con otra.",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps the form usable when the network fails", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    await choosePhoto();
    describePhoto();
    save();

    expect((await screen.findByRole("alert")).textContent).toContain(
      "No hay conexión.",
    );
    expect(
      screen
        .getByRole("button", { name: "Guardar foto" })
        .hasAttribute("disabled"),
    ).toBe(false);
    expect(
      (screen.getByLabelText(DESCRIPTION) as HTMLTextAreaElement).value,
    ).toBe(ALT);
  });
});
