import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SupportRequestDialog } from "@/components/support-request-dialog";
import { SENT_NOTICE } from "@/lib/requests/form";

const THANKS = "¡Gracias! Recibimos tu solicitud y te contactaremos pronto.";

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status });

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const renderDialog = () =>
  render(
    <SupportRequestDialog
      role="editor"
      triggerLabel="Crear cuenta"
      title="Registrarse como editor"
      description="Déjanos tus datos."
    />,
  );

const openDialog = async () => {
  fireEvent.click(screen.getByRole("button", { name: "Crear cuenta" }));
  return screen.findByRole("dialog");
};

const type = (label: string | RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

const fillValid = () => {
  type("Nombre", "Rosa Quispe");
  type("Teléfono", "+51 987 654 321");
  type("Motivo", "Hablo asháninka y quiero ayudar a validar traducciones.");
  fireEvent.click(
    screen.getByRole("checkbox", { name: /Acepto que me contacten/ }),
  );
};

const send = () =>
  fireEvent.click(screen.getByRole("button", { name: "Enviar solicitud" }));

describe("SupportRequestDialog", () => {
  // AC-S3-1
  it("opens on the role of its card", async () => {
    renderDialog();
    const dialog = await openDialog();

    expect(
      within(dialog).getByRole("heading", { name: "Registrarse como editor" }),
    ).toBeTruthy();
    expect(
      within(dialog).getByRole("combobox", { name: "¿Cómo quieres apoyar?" })
        .textContent,
    ).toContain("Editor");
  });

  // AC-S3-3
  it("shows a message under each empty required field and sends nothing", async () => {
    renderDialog();
    await openDialog();

    send();

    expect(await screen.findByText("Ingresa tu nombre.")).toBeTruthy();
    expect(
      screen.getByText("Ingresa un teléfono de 7 a 15 dígitos."),
    ).toBeTruthy();
    expect(
      screen.getByText("Cuéntanos un poco más (mínimo 10 caracteres)."),
    ).toBeTruthy();
    expect(screen.getByText("Debes aceptar para poder enviar.")).toBeTruthy();
    expect(screen.getByLabelText("Nombre").getAttribute("aria-invalid")).toBe(
      "true",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("clears a field's message once the person edits it", async () => {
    renderDialog();
    await openDialog();
    send();
    await screen.findByText("Ingresa tu nombre.");

    type("Nombre", "Rosa");

    expect(screen.queryByText("Ingresa tu nombre.")).toBeNull();
    expect(
      screen.getByText("Ingresa un teléfono de 7 a 15 dígitos."),
    ).toBeTruthy();
  });

  // AC-S3-4
  it("counts the motivo and stops it at 1000 characters", async () => {
    renderDialog();
    await openDialog();

    expect(screen.getByText("0 / 1000")).toBeTruthy();
    type("Motivo", "a".repeat(1200));

    expect(screen.getByText("1000 / 1000")).toBeTruthy();
    expect((screen.getByLabelText("Motivo") as HTMLTextAreaElement).value).toBe(
      "a".repeat(1000),
    );
  });

  // AC-S3-6
  it("sends, closes, shows the snackbar outside the dialog and clears the form", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { ok: true, message: THANKS }),
    );
    renderDialog();
    await openDialog();
    fillValid();

    send();

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByRole("status").textContent).toContain(SENT_NOTICE);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      nombre: "Rosa Quispe",
      telefono: "+51 987 654 321",
      email: "",
      rol: "editor",
      motivo: "Hablo asháninka y quiero ayudar a validar traducciones.",
      consentimiento: true,
      website: "",
    });

    await openDialog();
    expect((screen.getByLabelText("Nombre") as HTMLInputElement).value).toBe(
      "",
    );
    expect(
      screen
        .getByRole("checkbox", { name: /Acepto que me contacten/ })
        .getAttribute("aria-checked"),
    ).toBe("false");
  });

  // AC-S3-7
  it("keeps what was typed and shows the server's message on a 500", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(500, {
        error: "server_error",
        message: "Intenta más tarde.",
      }),
    );
    renderDialog();
    await openDialog();
    fillValid();

    send();

    expect((await screen.findByRole("alert")).textContent).toBe(
      "Intenta más tarde.",
    );
    expect((screen.getByLabelText("Nombre") as HTMLInputElement).value).toBe(
      "Rosa Quispe",
    );
    expect(
      (
        screen.getByRole("button", {
          name: "Enviar solicitud",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
  });

  it("shows the server's field errors under their fields", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, {
        error: "validation_error",
        message: "Revisa los campos marcados.",
        fields: { telefono: "Ingresa un teléfono de 7 a 15 dígitos." },
      }),
    );
    renderDialog();
    await openDialog();
    fillValid();

    send();

    expect(
      await screen.findByText("Ingresa un teléfono de 7 a 15 dígitos."),
    ).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toBe(
      "Revisa los campos marcados.",
    );
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByLabelText("Teléfono")),
    );
  });

  it("reports a network failure in Spanish", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    renderDialog();
    await openDialog();
    fillValid();

    send();

    expect((await screen.findByRole("alert")).textContent).toContain(
      "No pudimos conectarnos",
    );
  });

  // AC-S3-5
  it("disables the button while sending and ignores a second click", async () => {
    let finish: (response: Response) => void = () => {};
    fetchMock.mockReturnValue(
      new Promise<Response>((resolve) => {
        finish = resolve;
      }),
    );
    renderDialog();
    await openDialog();
    fillValid();

    send();
    const sending = await screen.findByRole("button", { name: "Enviando…" });
    expect((sending as HTMLButtonElement).disabled).toBe(true);
    fireEvent.submit(screen.getByLabelText("Nombre").closest("form")!);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => {
      finish(jsonResponse(200, { ok: true, message: THANKS }));
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  // AC-S3-12
  it("shows no snackbar before a send succeeds", async () => {
    renderDialog();
    await openDialog();

    expect(screen.getByRole("status").textContent).toBe("");
    send();
    await screen.findByText("Ingresa tu nombre.");

    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("shows no snackbar when the send fails", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(500, {
        error: "server_error",
        message: "Intenta más tarde.",
      }),
    );
    renderDialog();
    await openDialog();
    fillValid();

    send();
    await screen.findByRole("alert");

    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("lets the person close the snackbar", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { ok: true, message: THANKS }),
    );
    renderDialog();
    await openDialog();
    fillValid();
    send();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    fireEvent.click(screen.getByRole("button", { name: "Cerrar aviso" }));

    expect(screen.getByRole("status").textContent).toBe("");
  });

  // AC-S3-8
  it("has a honeypot that people cannot reach and that travels in the POST", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { ok: true, message: THANKS }),
    );
    renderDialog();
    const dialog = await openDialog();
    const trap = dialog.querySelector<HTMLInputElement>(
      'input[name="website"]',
    )!;

    expect(trap.tabIndex).toBe(-1);
    expect(trap.getAttribute("aria-hidden")).toBe("true");
    expect(trap.getAttribute("autocomplete")).toBe("off");
    expect(trap.type).toBe("text");
    expect(trap.className).toContain("absolute");
    expect(trap.className).not.toContain("hidden");

    fillValid();
    fireEvent.change(trap, { target: { value: "http://spam.example" } });
    send();

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).website).toBe(
      "http://spam.example",
    );
  });

  // AC-S3-11
  it("links the consent to the privacy policy in a new tab", async () => {
    renderDialog();
    await openDialog();

    const link = screen.getByRole("link", { name: "Política de privacidad" });

    expect(link.getAttribute("href")).toBe("/privacidad");
    expect(link.getAttribute("target")).toBe("_blank");
  });
});
