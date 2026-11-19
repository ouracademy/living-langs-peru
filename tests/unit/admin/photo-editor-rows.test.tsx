import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Photo } from "@/lib/peoples";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const { PhotoEditor } = await import("@/components/admin/photo-editor");

const SHA = "a".repeat(40);
const NEXT_SHA = "b".repeat(40);
const photos = (
  JSON.parse(
    readFileSync(
      join(process.cwd(), "src/data/peoples/ashaninka.json"),
      "utf8",
    ),
  ).photos as Photo[]
).slice(0, 3);

let fetchMock: ReturnType<typeof vi.fn>;

/** Answers like the route: the list as committed and the new sha. */
function answerWith(list: Photo[], message: string) {
  fetchMock.mockResolvedValueOnce(
    Response.json({ ok: true, sha: NEXT_SHA, photos: list, message }),
  );
}

function sentBody(): Record<string, string> {
  const [, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
  return JSON.parse(init.body as string);
}

function sentMethod(): string | undefined {
  const [, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
  return init.method;
}

function rows() {
  return within(
    screen.getByRole("list", { name: "Fotos de la galería" }),
  ).getAllByRole("listitem");
}

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  render(<PhotoEditor photos={photos} sha={SHA} />);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("ordering (AC-E3-7)", () => {
  it("disables «Subir» on the first photo and «Bajar» on the last", () => {
    expect(
      screen.getByRole("button", { name: "Subir la foto 1" }),
    ).toHaveProperty("disabled", true);
    expect(
      screen.getByRole("button", { name: "Bajar la foto 3" }),
    ).toHaveProperty("disabled", true);
  });

  it("moves with the keyboard and keeps the focus on the moved photo", async () => {
    answerWith(
      [photos[1], photos[0], photos[2]],
      "Orden guardado. Se verá en la web en 1–2 minutos.",
    );
    const down = screen.getByRole("button", { name: "Bajar la foto 1" });
    down.focus();
    // A keyboard press on a focused button is a click.
    fireEvent.click(down);

    expect(await screen.findByText(/Orden guardado/)).toBeTruthy();
    expect(sentMethod()).toBe("PATCH");
    expect(sentBody()).toEqual({
      action: "move",
      src: photos[0].src,
      direction: "down",
      sha: SHA,
    });
    expect(rows()[1].textContent).toContain(photos[0].alt);
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Bajar la foto 2" }),
      ),
    );
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("sends the new sha with the next save", async () => {
    answerWith([photos[1], photos[0], photos[2]], "Orden guardado.");
    fireEvent.click(screen.getByRole("button", { name: "Bajar la foto 1" }));
    await screen.findByText("Orden guardado.");

    answerWith([photos[1], photos[2], photos[0]], "Orden guardado otra vez.");
    fireEvent.click(screen.getByRole("button", { name: "Bajar la foto 2" }));
    await screen.findByText("Orden guardado otra vez.");

    expect(sentBody().sha).toBe(NEXT_SHA);
  });

  // AC-E3-5
  it("shows a conflict and keeps the order as it was", async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json(
        {
          error: "version_conflict",
          message: "Alguien guardó antes. Recarga y vuelve a intentar.",
        },
        { status: 409 },
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "Bajar la foto 1" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Alguien guardó un cambio mientras editabas.",
    );
    expect(rows()[0].textContent).toContain(photos[0].alt);
    expect(refresh).not.toHaveBeenCalled();

    // UI-12: reading the branch again is one tap away.
    fireEvent.click(screen.getByRole("button", { name: "Recargar la lista" }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});

describe("editing", () => {
  it("opens the photo's data, saves the change and closes", async () => {
    fireEvent.click(
      screen.getByRole("button", { name: "Editar los datos de la foto 2" }),
    );
    const form = screen.getByRole("form", {
      name: "Editar los datos de la foto",
    });
    const license = within(form).getByLabelText("Licencia") as HTMLInputElement;
    expect(license.value).toBe(photos[1].credit.license);

    const edited = {
      ...photos[1],
      credit: { ...photos[1].credit, license: "CC BY 4.0" },
    };
    answerWith(
      [photos[0], edited, photos[2]],
      "Cambios guardados. Se verán en la web en 1–2 minutos.",
    );
    fireEvent.change(license, { target: { value: "CC BY 4.0" } });
    fireEvent.click(
      within(form).getByRole("button", { name: "Guardar cambios" }),
    );

    expect(await screen.findByText(/Cambios guardados/)).toBeTruthy();
    expect(sentMethod()).toBe("PATCH");
    expect(sentBody()).toMatchObject({
      action: "edit",
      src: photos[1].src,
      license: "CC BY 4.0",
      author: photos[1].credit.author,
      sha: SHA,
    });
    expect(screen.queryByRole("form")).toBeNull();
    expect(rows()[1].textContent).toContain("CC BY 4.0");
  });

  it("does not send an edit with a source URL that is not https", async () => {
    fireEvent.click(
      screen.getByRole("button", { name: "Editar los datos de la foto 1" }),
    );
    const form = screen.getByRole("form", {
      name: "Editar los datos de la foto",
    });
    fireEvent.change(within(form).getByLabelText(/Dirección de origen/), {
      target: { value: "http://example.org/x" },
    });
    fireEvent.click(
      within(form).getByRole("button", { name: "Guardar cambios" }),
    );

    expect(
      await within(form).findByText(/tiene que empezar con https/),
    ).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // 2026-11-18: author and license fall back to the team's credit.
  it("sends the team's credit when author and license are emptied", async () => {
    answerWith(photos, "Cambios guardados.");
    fireEvent.click(
      screen.getByRole("button", { name: "Editar los datos de la foto 1" }),
    );
    const form = screen.getByRole("form", {
      name: "Editar los datos de la foto",
    });
    for (const label of ["Autor", "Licencia"]) {
      fireEvent.change(within(form).getByLabelText(label), {
        target: { value: "" },
      });
    }
    fireEvent.click(
      within(form).getByRole("button", { name: "Guardar cambios" }),
    );

    await screen.findByText("Cambios guardados.");
    expect(sentBody()).toMatchObject({
      author: "Living Langs Peru",
      license: "Foto del equipo",
    });
  });

  // UI-14
  it("waits for a change before saving, and Escape cancels", async () => {
    fireEvent.click(
      screen.getByRole("button", { name: "Editar los datos de la foto 1" }),
    );
    const form = screen.getByRole("form", {
      name: "Editar los datos de la foto",
    });
    expect(
      within(form).getByRole("button", { name: "Sin cambios" }),
    ).toHaveProperty("disabled", true);

    fireEvent.change(within(form).getByLabelText("Licencia"), {
      target: { value: "CC BY 4.0" },
    });
    expect(
      within(form).getByRole("button", { name: "Guardar cambios" }),
    ).toHaveProperty("disabled", false);

    fireEvent.keyDown(within(form).getByLabelText("Licencia"), {
      key: "Escape",
    });
    expect(screen.queryByRole("form")).toBeNull();
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Editar los datos de la foto 1" }),
      ),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("cancels without saving", () => {
    fireEvent.click(
      screen.getByRole("button", { name: "Editar los datos de la foto 1" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("form")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("row actions (UI-11)", () => {
  it("names each control with the photo's position and keeps «Quitar» apart", () => {
    const actions = screen.getByRole("group", {
      name: "Acciones de la foto 2",
    });
    const buttons = within(actions).getAllByRole("button");
    expect(buttons.map((button) => button.getAttribute("aria-label"))).toEqual([
      "Subir la foto 2",
      "Bajar la foto 2",
      "Editar los datos de la foto 2",
      "Quitar la foto 2",
    ]);
    // A spacer sits between «Editar» and «Quitar».
    expect(buttons[3].previousElementSibling?.tagName).toBe("SPAN");
  });
});

describe("removing (AC-E3-6)", () => {
  it("asks first, and the safe choice has the focus", () => {
    fireEvent.click(screen.getByRole("button", { name: "Quitar la foto 2" }));

    expect(
      screen.getByText(/¿Quitar la foto 2 de la galería\? También se borra/),
    ).toBeTruthy();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Cancelar" }),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("removes after confirming", async () => {
    answerWith(
      [photos[0], photos[2]],
      "Foto quitada. Se verá en la web en 1–2 minutos.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Quitar la foto 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Sí, quitar" }));

    expect(await screen.findByText(/Foto quitada/)).toBeTruthy();
    expect(sentMethod()).toBe("DELETE");
    expect(sentBody()).toEqual({ src: photos[1].src, sha: SHA });
    expect(rows()).toHaveLength(2);
    expect(screen.queryByText(/También se borra el archivo/)).toBeNull();
  });

  it("keeps the photo when the editor cancels", () => {
    fireEvent.click(screen.getByRole("button", { name: "Quitar la foto 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(rows()).toHaveLength(3);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
