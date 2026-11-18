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

const fields = {
  "Descripción (para quien no ve la foto)":
    "Tres mujeres asháninka tejen una cushma bajo un techo de palma.",
  Autor: "Centro de la Mujer Peruana Flora Tristán",
  Licencia: "CC BY-SA 4.0",
  "Dirección de origen (https://…)":
    "https://commons.wikimedia.org/wiki/File:Ejemplo.jpg",
};

function fillForm() {
  for (const [label, value] of Object.entries(fields)) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  }
  fireEvent.change(screen.getByLabelText("Foto (JPEG, PNG o WebP)"), {
    target: {
      files: [new File(["x"], "IMG_0001.jpeg", { type: "image/jpeg" })],
    },
  });
}

const save = () =>
  fireEvent.click(screen.getByRole("button", { name: "Guardar foto" }));

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
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

describe("Agregar foto", () => {
  // AC-E3-4: required fields never leave the browser empty.
  it("does not send anything while required fields are empty", async () => {
    save();

    expect(await screen.findByText("Elige una foto.")).toBeTruthy();
    expect(
      screen.getByText("Escribe una descripción de la foto."),
    ).toBeTruthy();
    expect(screen.getByText("Escribe quién tomó la foto.")).toBeTruthy();
    expect(screen.getByText("Escribe la licencia de la foto.")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(resizeToJpeg).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Autor").getAttribute("aria-invalid")).toBe(
      "true",
    );
  });

  it("refuses a generic description before uploading", async () => {
    fillForm();
    fireEvent.change(
      screen.getByLabelText("Descripción (para quien no ve la foto)"),
      { target: { value: "Foto" } },
    );
    save();

    expect(await screen.findByText(/demasiado genérica/)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // AC-E3-1: what is sent is the reduced JPEG, the fields and the sha.
  it("sends the reduced photo with every field and the sha", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        {
          ok: true,
          message: "Foto guardada. Se verá en la web en 1–2 minutos.",
        },
        { status: 201 },
      ),
    );
    fillForm();
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
    expect(body.get("alt")).toBe(
      fields["Descripción (para quien no ve la foto)"],
    );
    expect(body.get("author")).toBe(fields.Autor);
    expect((body.get("photo") as File).type).toBe("image/jpeg");
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("link", { name: "Ver la galería" }).getAttribute("href"),
    ).toBe("/ashaninka#galeria");
  });

  // AC-E3-5
  it("explains a conflict and keeps what the editor typed", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        {
          error: "version_conflict",
          message: "Alguien guardó antes. Recarga y vuelve a intentar.",
        },
        { status: 409 },
      ),
    );
    fillForm();
    save();

    expect((await screen.findByRole("alert")).textContent).toBe(
      "Alguien guardó antes. Recarga y vuelve a intentar.",
    );
    expect((screen.getByLabelText("Autor") as HTMLInputElement).value).toBe(
      fields.Autor,
    );
    expect(refresh).not.toHaveBeenCalled();
  });

  it("shows the server's field problems next to each field", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        {
          error: "photo_invalid",
          message: "Revisa la foto y los campos marcados.",
          fields: { license: "Escribe la licencia de la foto." },
        },
        { status: 400 },
      ),
    );
    fillForm();
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

  it("says so when the photo cannot be reduced, without uploading", async () => {
    resizeToJpeg.mockResolvedValue({ ok: false, problem: "unreadable" });
    fillForm();
    save();

    expect((await screen.findByRole("alert")).textContent).toBe(
      "No pudimos leer la foto. Prueba con otra.",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps the form usable when the network fails", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    fillForm();
    save();

    expect((await screen.findByRole("alert")).textContent).toBe(
      "No pudimos guardar la foto. Intenta de nuevo.",
    );
    expect(
      screen
        .getByRole("button", { name: "Guardar foto" })
        .hasAttribute("disabled"),
    ).toBe(false);
  });
});
