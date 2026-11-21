import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";

// /admin/juego against the fake Supabase (tests/e2e/fake-supabase.mjs), which
// starts with the fixture published as version 1. The web server runs with
// test-only ADMIN_USER / ADMIN_PASSWORD (playwright.config.ts).
//
// One serial flow: publishing changes the fake's version numbers, so the steps
// depend on each other. The packs published are the fixture itself, so the
// game tests running in parallel keep seeing the same words.

const fixtureText = readFileSync(
  join(process.cwd(), "tests", "e2e", "fixtures", "word-jump-pack.json"),
  "utf8",
);
const credentials = { username: "e2e-editor", password: "e2e-not-a-secret" };

async function importFile(page: Page, text: string, name = "paquete.json") {
  await page.getByLabel("Importar un .json").setInputFiles({
    name,
    mimeType: "application/json",
    buffer: Buffer.from(text),
  });
}

async function publishWithNote(page: Page, note: string) {
  await page.getByLabel(/Nota de publicación/).fill(note);
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
}

/** The public page shows the new version at the latest on the second visit (AC-SP6-11). */
async function expectPublicVersion(page: Page, version: number) {
  await expect
    .poll(
      async () => {
        await page.goto("/juegos/saltapalabras/ashaninka");
        return page.locator("main").innerText();
      },
      { timeout: 15_000, intervals: [250, 500, 1000] },
    )
    .toContain(`Versión ${version}`);
}

// AC-SP5-8
test("/admin/juego and its API ask for credentials", async ({ request }) => {
  expect((await request.get("/admin/juego")).status()).toBe(401);
  expect((await request.get("/api/admin/juego/ashaninka")).status()).toBe(401);
  expect(
    (
      await request.post("/api/admin/juego/ashaninka/publicar", { data: {} })
    ).status(),
  ).toBe(401);
});

test.describe.serial("/admin/juego, end to end", () => {
  test.use({ httpCredentials: credentials });

  // AC-SP6-4, AC-SP6-10, AC-SP6-11, AC-SP6-12
  test("import, try and publish a pack; the game shows the new version", async ({
    page,
  }) => {
    await page.goto("/admin");
    await page.getByRole("link", { name: /Paquetes de Saltapalabras/ }).click();
    await expect(page).toHaveURL(/\/admin\/juego$/);
    await expect(page.getByText(/Versión 1 ·/)).toBeVisible();
    await expect(page.getByText(/Sin juego, por diseño/)).toBeVisible();

    // An invalid file changes nothing (AC-SP6-4).
    await importFile(page, "{ roto");
    await expect(
      page.getByText(/no tiene el formato de un paquete/),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Publicar" })).toHaveCount(0);

    await importFile(page, fixtureText);
    await expect(page.getByText(/cargado/)).toBeVisible();

    // «Probar» plays the unverified item too, marked (AC-SP6-10).
    await page.getByRole("button", { name: "Probar" }).click();
    await expect(
      page.getByText(/Vista previa: puede tener errores/),
    ).toBeVisible();
    await expect(page.getByText(/1 sin verificar/).first()).toBeVisible();
    await page.getByRole("button", { name: "Cerrar la prueba" }).click();

    // No note, no publishing (AC-SP6-12).
    await expect(
      page.getByRole("button", { name: "Publicar", exact: true }),
    ).toBeDisabled();

    await publishWithNote(page, "Revisado por PRUEBA");
    await expect(page.getByText(/Publicada la versión 2/)).toBeVisible();
    await expect(page.getByText(/Versión 2 ·/)).toBeVisible();

    await expectPublicVersion(page, 2);
  });

  // AC-SP6-7
  test("a stale version shows the conflict, and «Publicar igual» publishes", async ({
    page,
  }) => {
    await page.goto("/admin/juego");
    await importFile(page, fixtureText);

    // Someone else publishes in the meantime.
    const other = await page.request.post(
      "/api/admin/juego/ashaninka/publicar",
      {
        data: {
          pack: JSON.parse(fixtureText),
          expectedVersion: 2,
          note: "Otra persona, PRUEBA",
        },
      },
    );
    expect((await other.json()).version).toBe(3);

    await publishWithNote(page, "Mi cambio, PRUEBA");
    // Scoped to main: Next adds its own role="alert" (the route announcer).
    const alert = page.locator("main").getByRole("alert");
    await expect(alert).toContainText("Alguien publicó otra versión");

    const download = page.waitForEvent("download");
    await alert.getByRole("button", { name: "Descargar la publicada" }).click();
    expect((await download).suggestedFilename()).toBe("ashaninka-v3.json");

    await alert.getByRole("button", { name: "Publicar igual" }).click();
    await expect(page.getByText(/Publicada la versión 4/)).toBeVisible();
  });

  // AC-SP6-9, AC-SP6-3
  test("restoring an old version publishes it as a new one", async ({
    page,
  }) => {
    await page.goto("/admin/juego");
    await expect(page.getByText("Versión 4 (publicada)")).toBeVisible();

    // A downloaded version imports back as the same pack (AC-SP6-3).
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Descargar la versión 1" }).click();
    const file = await (await download).path();
    expect(JSON.parse(readFileSync(file, "utf8"))).toEqual(
      JSON.parse(fixtureText),
    );

    await page.getByRole("button", { name: "Restaurar la versión 1" }).click();
    await page.getByRole("button", { name: "Sí, restaurar" }).click();
    await expect(
      page.getByText("La versión 1 quedó publicada como versión 5."),
    ).toBeVisible();
    await expect(page.getByText("Versión 5 (publicada)")).toBeVisible();
    await expect(
      page.getByText(/Restaurada desde la versión 1/).first(),
    ).toBeVisible();

    await expectPublicVersion(page, 5);
  });

  // AC-SP6b-1, AC-SP6b-2, AC-SP6b-3, AC-SP6b-8, AC-SP6b-9. The edits are
  // discarded, not published: the game tests in parallel must keep seeing the
  // fixture. Publishing an edited pack is the same flow as above.
  test("edit the published pack in the page: emoji, verification, reload, try", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/admin/juego");

    await page
      .getByRole("button", { name: "Editar el paquete publicado" })
      .click();
    await expect(page.getByText(/Copiamos el paquete publicado/)).toBeVisible();
    await expect(page.getByLabel("Tema", { exact: true })).toHaveValue(
      "tema-prueba",
    );

    // Keyboard only: open the row, change the emoji, save with Enter.
    await page.getByRole("button", { name: "Editar «PRUEBA uno»" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByLabel("Palabra", { exact: true })).toBeFocused();
    await page.getByLabel("Dibujo (emoji)").fill("🍐");
    await page.keyboard.press("Enter");
    const status = page.locator("main").getByRole("status").last();
    await expect(status).toContainText("Cambios en «PRUEBA uno» guardados");
    await expect(
      page.getByRole("button", { name: "Editar «PRUEBA uno»" }),
    ).toBeFocused();

    // Unverify another word.
    await page
      .getByRole("checkbox", { name: "Verificada: PRUEBA dos" })
      .click();
    await expect(status).toContainText("«PRUEBA dos» marcada sin verificar");

    // No horizontal scroll at 360 px.
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);

    // The edits survive a reload (AC-SP6-13) and «Probar» plays them.
    await page.reload();
    await expect(page.getByText("🍐").first()).toBeVisible();
    await expect(
      page.getByRole("checkbox", { name: "Verificada: PRUEBA dos" }),
    ).not.toBeChecked();
    await page.getByRole("button", { name: "Probar" }).click();
    await expect(
      page.getByText(/Vista previa: puede tener errores/),
    ).toBeVisible();
    await page.getByRole("button", { name: "Cerrar la prueba" }).click();

    await page.getByRole("button", { name: "Descartar" }).click();
    await page.getByRole("button", { name: "Sí, descartar" }).click();
    await expect(
      page.getByRole("button", { name: "Editar el paquete publicado" }),
    ).toBeVisible();
  });
});
