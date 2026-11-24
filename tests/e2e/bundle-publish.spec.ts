import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";

// AC-L4-1: publishing a uro bundle from /admin/lenguas makes its verified
// words appear in /diccionario/uro and its game, without a deploy. It runs in
// its own Playwright project, after every other spec (playwright.config.ts):
// the specs that check uro has no content must never see this.

const fixtureText = readFileSync(
  join(process.cwd(), "tests", "e2e", "fixtures", "uro-bundle-prueba.json"),
  "utf8",
);

test.use({
  httpCredentials: { username: "e2e-editor", password: "e2e-not-a-secret" },
});
test.describe.configure({ mode: "serial" });

/** A published page shows the new content at the latest on the second visit. */
async function expectEventually(page: Page, path: string, text: RegExp) {
  await expect
    .poll(
      async () => {
        await page.goto(path);
        return page.locator("main").innerText();
      },
      { timeout: 30_000, intervals: [500, 1000, 2000] },
    )
    .toMatch(text);
}

test("publishes a uro bundle and its words reach the dictionary and the game", async ({
  page,
}) => {
  await page.goto("/admin/lenguas/uro");
  await page.getByLabel("Subir JSON").setInputFiles({
    name: "uro.json",
    mimeType: "application/json",
    buffer: Buffer.from(fixtureText),
  });
  await expect(page.getByText(/Copia de trabajo: 4 palabras/)).toBeVisible();

  await page.getByLabel(/Nota de publicación/).fill("Paquete de PRUEBA e2e");
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Publicada la versión 1",
  );
  await expect(page.getByText("Versión 1 (publicada)")).toBeVisible();

  await expectEventually(page, "/diccionario/uro", /pruebauno/);
  await expect(page.locator("main")).not.toContainText("pruebasinverificar");

  await expectEventually(
    page,
    "/juegos/saltapalabras/uro",
    /Tema de PRUEBA uro/,
  );
});

test("lists the published version on /admin/lenguas and in the history", async ({
  page,
}) => {
  await page.goto("/admin/lenguas");
  await expect(page.getByRole("link", { name: /Uro/ })).toContainText(
    "Versión 1",
  );

  await page.goto("/admin/lenguas/uro");
  await expect(page.getByText(/3 de 4 palabras verificadas/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Descargar la versión 1" }),
  ).toBeVisible();
});

// AC-L4-3, AC-L4-4 (F3): edit the published uro in the interface — fix a
// translation, add a verified word, move a letter with the keyboard — publish,
// and see the new translation and the new order on the public dictionary.
test("edits a word and the alphabet in the interface and publishes them", async ({
  page,
}) => {
  await page.goto("/admin/lenguas/uro");
  await page
    .getByRole("button", { name: "Trabajar sobre lo publicado" })
    .click();

  const row = page.locator("#palabra-pruebauno");
  await row.getByRole("button", { name: "Editar «pruebauno»" }).click();
  await row.getByLabel("Traducciones").fill("PRUEBA uno editada");
  await row.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("status")).toContainText("«pruebauno» guardada");

  await page.getByRole("button", { name: "Agregar una palabra" }).click();
  const added = page.getByRole("region", { name: "Palabra nueva" });
  await added.getByLabel("Palabra", { exact: true }).fill("spruebacinco");
  await added.getByLabel("Traducciones").fill("PRUEBA cinco");
  await added.getByLabel("Verificada: puede aparecer en el sitio").check();
  await added.getByLabel("Quién o qué la verificó").fill("e2e de PRUEBA");
  await added.getByRole("button", { name: "Agregar", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "«spruebacinco» agregada",
  );

  // «s» goes before «p», with the keyboard: the focus follows the letter.
  await page.getByRole("tab", { name: "Alfabeto" }).click();
  await page.getByRole("button", { name: "Subir «s»" }).focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Subir «s»" })).toBeFocused();
  const terms = page
    .getByRole("region", { name: "Así ordena el diccionario" })
    .getByRole("term");
  await expect(terms).toHaveText(["S", "P"]);

  await page.getByLabel(/Nota de publicación/).fill("Edición de PRUEBA e2e");
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Publicada la versión 2",
  );

  await expectEventually(page, "/diccionario/uro", /PRUEBA uno editada/);
  const text = await page.locator("main").innerText();
  expect(text.indexOf("spruebacinco")).toBeGreaterThanOrEqual(0);
  expect(text.indexOf("spruebacinco")).toBeLessThan(text.indexOf("pruebauno"));
});
