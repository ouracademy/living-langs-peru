import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";

// /admin/lenguas without publishing (gestor-lenguas F2): uploading, the
// differences summary, «Probar» and the phone layout. Everything here stays in
// the browser, so it runs in parallel with the rest; publishing lives in
// bundle-publish.spec.ts, which runs last (playwright.config.ts).

const fixtureText = readFileSync(
  join(process.cwd(), "tests", "e2e", "fixtures", "uro-bundle-prueba.json"),
  "utf8",
);
const credentials = { username: "e2e-editor", password: "e2e-not-a-secret" };

test.use({ httpCredentials: credentials });

async function upload(page: Page, text: string, name = "uro.json") {
  await page.getByLabel("Subir JSON").setInputFiles({
    name,
    mimeType: "application/json",
    buffer: Buffer.from(text),
  });
}

test("lists the two languages from /admin", async ({ page }) => {
  await page.goto("/admin");
  await page.getByRole("link", { name: /Contenido de las lenguas/ }).click();

  await expect(
    page.getByRole("heading", { level: 1, name: "Contenido de las lenguas" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Asháninka/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Uro/ })).toBeVisible();
});

test("uploads a JSON, shows its issues and tries it, verified words only", async ({
  page,
}) => {
  await page.goto("/admin/lenguas/uro");
  await upload(page, fixtureText);

  await expect(page.getByRole("status")).toContainText("cargado");
  await expect(page.getByText(/Copia de trabajo: 4 palabras/)).toBeVisible();
  await expect(page.getByText(/avisos?: no impiden publicar/)).toBeVisible();

  await page.getByRole("button", { name: "Probar" }).click();
  const preview = page.locator("div", {
    has: page.getByRole("heading", { name: "Prueba: diccionario" }),
  });
  await expect(preview.getByText("pruebauno").first()).toBeVisible();
  await expect(preview.getByText("pruebasinverificar")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Prueba: Saltapalabras" }),
  ).toBeVisible();
  await expect(page.getByText("Tema de PRUEBA uro")).toBeVisible();
});

// AC-L4-2
test("summarises the differences and replaces nothing without confirming", async ({
  page,
}) => {
  await page.goto("/admin/lenguas/uro");
  await upload(page, fixtureText);
  await expect(page.getByText(/Copia de trabajo: 4 palabras/)).toBeVisible();

  const changed = JSON.parse(fixtureText);
  changed.entries = changed.entries.slice(0, 2);
  changed.entries[0].translations = ["PRUEBA uno corregida"];
  changed.themes = [];
  await upload(page, JSON.stringify(changed), "cambiado.json");

  const summary = page.getByRole("region", {
    name: /¿Reemplazar el contenido con «cambiado.json»\?/,
  });
  await expect(summary).toContainText("1 palabra cambiada");
  await expect(summary).toContainText("2 palabras que faltan");

  await summary.getByRole("button", { name: "Cancelar" }).click();
  await expect(page.getByRole("status")).toContainText("sigue igual");
  await expect(page.getByText(/Copia de trabajo: 4 palabras/)).toBeVisible();

  await upload(page, JSON.stringify(changed), "cambiado.json");
  await page
    .getByRole("button", { name: "Reemplazar la copia de trabajo" })
    .click();
  await expect(page.getByText(/Copia de trabajo: 2 palabras/)).toBeVisible();
});

test("refuses a file that is not a language bundle", async ({ page }) => {
  await page.goto("/admin/lenguas/uro");
  await upload(page, "{ roto", "roto.json");

  await expect(page.getByRole("status")).toContainText(
    "no tiene el formato de un paquete de lengua",
  );
  await expect(page.getByText(/Copia de trabajo: /)).toHaveCount(0);
});

test("fits a 360 px phone without horizontal scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/admin/lenguas/uro");
  await upload(page, fixtureText);
  await expect(page.getByText(/Copia de trabajo: 4 palabras/)).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);

  const upload44 = await page.getByText("Subir JSON").boundingBox();
  expect(upload44?.height ?? 0).toBeGreaterThanOrEqual(44);
});

// AC-L4-6 (F3): every tab of the editor fits a 360 px phone, and the tabs move
// with the arrow keys.
test("the editor fits a 360 px phone and its tabs work with the keyboard", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/admin/lenguas/uro");
  await upload(page, fixtureText);
  await expect(page.getByText(/Copia de trabajo: 4 palabras/)).toBeVisible();

  const overflow = () =>
    page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );

  await page
    .locator("#palabra-pruebauno")
    .getByRole("button", { name: "Editar «pruebauno»" })
    .click();
  expect(await overflow()).toBeLessThanOrEqual(0);

  await page.getByRole("tab", { name: "Palabras" }).focus();
  for (const name of ["Juegos", "Alfabeto", "Fuentes"]) {
    await page.keyboard.press("ArrowRight");
    const tab = page.getByRole("tab", { name });
    await expect(tab).toBeFocused();
    await expect(tab).toHaveAttribute("aria-selected", "true");
    expect(await overflow()).toBeLessThanOrEqual(0);
  }

  const tabBox = await page.getByRole("tab", { name: "Fuentes" }).boundingBox();
  expect(tabBox?.height ?? 0).toBeGreaterThanOrEqual(44);
});
