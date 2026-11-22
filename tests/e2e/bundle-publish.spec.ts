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
