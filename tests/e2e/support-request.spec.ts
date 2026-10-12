import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const THANKS = "¡Gracias! Recibimos tu solicitud y te contactaremos pronto.";

const openFrom = async (page: Page, button: string) => {
  await page.goto("/");
  await page.locator("#apoyanos").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: button }).click();
  return page.getByRole("dialog");
};

const fillValid = async (page: Page) => {
  await page.getByLabel("Nombre").fill("Rosa Quispe");
  await page.getByLabel("Teléfono").fill("+51 987 654 321");
  await page
    .getByLabel("Motivo")
    .fill("Hablo asháninka y quiero ayudar a validar traducciones.");
  await page.getByRole("checkbox", { name: /Acepto que me contacten/ }).click();
};

// AC-S3-1
for (const [button, role] of [
  ["Crear cuenta", "Editor"],
  ["Donar", "Donador"],
] as const) {
  test(`«${button}» opens the form on «${role}» without navigating`, async ({
    page,
  }) => {
    const dialog = await openFrom(page, button);

    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
    await expect(
      dialog.getByRole("combobox", { name: "¿Cómo quieres apoyar?" }),
    ).toContainText(role);
  });
}

// AC-S3-2
test("Esc closes the dialog, returns focus to its button and keeps what was typed", async ({
  page,
}) => {
  const dialog = await openFrom(page, "Crear cuenta");
  await dialog.getByLabel("Nombre").fill("Rosa");

  await page.keyboard.press("Escape");

  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Crear cuenta" }),
  ).toBeFocused();

  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByRole("dialog").getByLabel("Nombre")).toHaveValue(
    "Rosa",
  );
});

// AC-S3-3
test("sending an empty form shows a message under each required field and sends nothing", async ({
  page,
}) => {
  let requests = 0;
  await page.route("**/api/solicitudes", (route) => {
    requests += 1;
    return route.abort();
  });
  const dialog = await openFrom(page, "Crear cuenta");

  await dialog.getByRole("button", { name: "Enviar solicitud" }).click();

  await expect(dialog.getByText("Ingresa tu nombre.")).toBeVisible();
  await expect(
    dialog.getByText("Ingresa un teléfono de 7 a 15 dígitos."),
  ).toBeVisible();
  await expect(
    dialog.getByText("Cuéntanos un poco más (mínimo 10 caracteres)."),
  ).toBeVisible();
  await expect(
    dialog.getByText("Debes aceptar para poder enviar."),
  ).toBeVisible();
  await expect(dialog.getByLabel("Nombre")).toBeFocused();
  await expect(dialog.getByLabel("Nombre")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  expect(requests).toBe(0);
});

// AC-S3-4
test("the motivo counter shows n / 1000 and stops at 1000", async ({
  page,
}) => {
  const dialog = await openFrom(page, "Donar");
  const motivo = dialog.getByLabel("Motivo");

  await expect(dialog.getByText("0 / 1000")).toBeVisible();
  await motivo.fill("a".repeat(1200));

  await expect(dialog.getByText("1000 / 1000")).toBeVisible();
  await expect(motivo).toHaveValue("a".repeat(1000));
});

// AC-S3-6, AC-S3-8, AC-S3-10
test("a valid send posts the contract, closes the dialog and thanks the person", async ({
  page,
}) => {
  let body: Record<string, unknown> | undefined;
  await page.route("**/api/solicitudes", async (route) => {
    body = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, message: THANKS }),
    });
  });
  const dialog = await openFrom(page, "Donar");
  await fillValid(page);

  await dialog.getByRole("button", { name: "Enviar solicitud" }).click();

  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("status").filter({ hasText: THANKS }),
  ).toBeVisible();
  expect(body).toEqual({
    nombre: "Rosa Quispe",
    telefono: "+51 987 654 321",
    email: "",
    rol: "donador",
    motivo: "Hablo asháninka y quiero ayudar a validar traducciones.",
    consentimiento: true,
    website: "",
  });

  // The form starts clean the next time.
  await page.getByRole("button", { name: "Donar" }).click();
  await expect(page.getByRole("dialog").getByLabel("Nombre")).toHaveValue("");
  await expect(
    page.getByRole("checkbox", { name: /Acepto que me contacten/ }),
  ).not.toBeChecked();
});

// AC-S3-7
test("a server error shows a message, keeps what was typed and re-enables the button", async ({
  page,
}) => {
  await page.route("**/api/solicitudes", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({
        error: "server_error",
        message: "No pudimos guardar tu solicitud. Intenta de nuevo más tarde.",
      }),
    }),
  );
  const dialog = await openFrom(page, "Crear cuenta");
  await fillValid(page);

  await dialog.getByRole("button", { name: "Enviar solicitud" }).click();

  await expect(dialog.getByRole("alert")).toHaveText(
    "No pudimos guardar tu solicitud. Intenta de nuevo más tarde.",
  );
  await expect(dialog.getByLabel("Nombre")).toHaveValue("Rosa Quispe");
  await expect(
    dialog.getByRole("button", { name: "Enviar solicitud" }),
  ).toBeEnabled();
});

test("a network failure is reported in Spanish", async ({ page }) => {
  await page.route("**/api/solicitudes", (route) => route.abort());
  const dialog = await openFrom(page, "Crear cuenta");
  await fillValid(page);

  await dialog.getByRole("button", { name: "Enviar solicitud" }).click();

  await expect(dialog.getByRole("alert")).toContainText(
    "No pudimos conectarnos",
  );
});

test("the server's field errors appear under their fields", async ({
  page,
}) => {
  await page.route("**/api/solicitudes", (route) =>
    route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({
        error: "validation_error",
        message: "Revisa los campos marcados.",
        fields: { telefono: "Ingresa un teléfono de 7 a 15 dígitos." },
      }),
    }),
  );
  const dialog = await openFrom(page, "Crear cuenta");
  await fillValid(page);

  await dialog.getByRole("button", { name: "Enviar solicitud" }).click();

  await expect(
    dialog.getByText("Ingresa un teléfono de 7 a 15 dígitos."),
  ).toBeVisible();
  await expect(dialog.getByLabel("Teléfono")).toBeFocused();
});

// AC-S3-5
test("while sending, the button is disabled and a double click sends once", async ({
  page,
}) => {
  let requests = 0;
  await page.route("**/api/solicitudes", async (route) => {
    requests += 1;
    await new Promise((resolve) => setTimeout(resolve, 600));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, message: THANKS }),
    });
  });
  const dialog = await openFrom(page, "Crear cuenta");
  await fillValid(page);
  const send = dialog.getByRole("button", { name: "Enviar solicitud" });

  await send.dblclick();

  await expect(
    dialog.getByRole("button", { name: "Enviando…" }),
  ).toBeDisabled();
  await expect(dialog).toBeHidden();
  expect(requests).toBe(1);
});

// AC-S3-8
test("the honeypot is off-screen, out of the tab order, hidden from assistive tech, and travels in the POST", async ({
  page,
}) => {
  let body: Record<string, unknown> | undefined;
  await page.route("**/api/solicitudes", async (route) => {
    body = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, message: THANKS }),
    });
  });
  const dialog = await openFrom(page, "Crear cuenta");
  const trap = dialog.locator('input[name="website"]');

  await expect(trap).toHaveAttribute("tabindex", "-1");
  await expect(trap).toHaveAttribute("aria-hidden", "true");
  await expect(trap).toHaveAttribute("autocomplete", "off");
  const { display, left } = await trap.evaluate((node) => {
    const style = getComputedStyle(node);
    return { display: style.display, left: node.getBoundingClientRect().left };
  });
  expect(display).not.toBe("none");
  expect(left).toBeLessThan(0);

  // Tabbing through the whole dialog never lands on it.
  for (let step = 0; step < 14; step += 1) {
    await page.keyboard.press("Tab");
    await expect(trap).not.toBeFocused();
  }

  await fillValid(page);
  await trap.evaluate((node: HTMLInputElement) => {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    setter?.call(node, "http://spam.example");
    node.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await dialog.getByRole("button", { name: "Enviar solicitud" }).click();

  await expect(dialog).toBeHidden();
  expect(body?.website).toBe("http://spam.example");
});

// AC-S3-11
test("the consent links to the privacy policy in a new tab", async ({
  page,
}) => {
  const dialog = await openFrom(page, "Crear cuenta");
  const link = dialog.getByRole("link", { name: "Política de privacidad" });

  await expect(link).toHaveAttribute("href", "/privacidad");
  await expect(link).toHaveAttribute("target", "_blank");
});

// AC-S3-9
test("on a 360 px screen the dialog fits and the page does not scroll sideways", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 640 });
  const dialog = await openFrom(page, "Crear cuenta");

  const box = await dialog.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(360);
  expect(box!.height).toBeLessThanOrEqual(640);

  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);

  // The long form scrolls inside the dialog, so the button is still reachable.
  await dialog
    .getByRole("button", { name: "Enviar solicitud" })
    .scrollIntoViewIfNeeded();
  await expect(
    dialog.getByRole("button", { name: "Enviar solicitud" }),
  ).toBeInViewport();
});
