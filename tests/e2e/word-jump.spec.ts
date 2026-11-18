import { readFileSync } from "node:fs";
import { join } from "node:path";

import { type Page, expect, test } from "@playwright/test";

import { findBundleLeaks } from "./bundle-leaks";

// The same fixture the fake Supabase serves: words marked PRUEBA (spec §13).
const pack = JSON.parse(
  readFileSync(join(__dirname, "fixtures", "word-jump-pack.json"), "utf8"),
) as {
  themes: {
    items: { word: string; translation: string; verified: boolean }[];
  }[];
};
const items = pack.themes[0].items;
const hidden = items.filter((item) => !item.verified).map((item) => item.word);

/** Every request the browser makes, to prove it never talks to Supabase. */
function recordRequests(page: Page): string[] {
  const urls: string[] = [];
  page.on("request", (request) => urls.push(request.url()));
  return urls;
}

/** AC-SP4-12: no 401, no sign-in, no way to /admin. */
async function expectNoLogin(page: Page) {
  await expect(page.locator('a[href^="/admin"]')).toHaveCount(0);
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
}

test.describe("Saltapalabras", () => {
  test("the library lists the languages from code, without login", async ({
    page,
  }) => {
    const response = await page.goto("/juegos/saltapalabras");

    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("link", { name: "Jugar en Asháninka" }),
    ).toBeVisible();
    await expect(page.getByText(/no tiene hablantes/)).toBeVisible();
    await expectNoLogin(page);
  });

  // AC-SP4-9
  test("uro answers 200 and explains why there is no game", async ({
    page,
  }) => {
    const response = await page.goto("/juegos/saltapalabras/uro");

    expect(response?.status()).toBe(200);
    await expect(page.getByText(/no tiene hablantes/)).toBeVisible();
    await expectNoLogin(page);
  });

  // AC-SP4-10
  test("an unknown language is a 404", async ({ page }) => {
    const response = await page.goto("/juegos/saltapalabras/klingon");

    expect(response?.status()).toBe(404);
  });

  // AC-SP4-2, AC-SP4-3, AC-SP4-12, AC-SP4-13
  test("a whole pic2word round, from the published pack to the summary", async ({
    page,
  }) => {
    const requests = recordRequests(page);
    const statuses: number[] = [];
    page.on("response", (response) => statuses.push(response.status()));

    await page.goto("/juegos/saltapalabras/ashaninka");
    await expectNoLogin(page);
    await page.getByRole("button", { name: /Tema de prueba/ }).click();

    for (let step = 0; step < 4; step++) {
      const label = await page
        .locator("main")
        .getByRole("img")
        .getAttribute("aria-label");
      const item = items.find((each) => each.translation === label);
      expect(item, `no item for ${label}`).toBeTruthy();

      await page.getByRole("button", { name: item!.word, exact: true }).click();
      await expect(page.getByRole("status")).toContainText("¡Correcto!");
      await expect(page.getByRole("status")).toContainText("Fuente de prueba");
      for (const word of hidden) {
        await expect(page.locator("main")).not.toContainText(word);
      }
      await page.getByRole("button", { name: "Seguir" }).click();
    }

    await expect(
      page.getByRole("heading", { name: "¡Ronda terminada!" }),
    ).toBeVisible();
    await expect(
      page.getByText("Acertaste a la primera 4 de 4."),
    ).toBeVisible();
    await expectNoLogin(page);

    expect(statuses).not.toContain(401);
    expect(
      requests.filter((url) => /\/rest\/v1|\/auth\/v1|:54329/.test(url)),
    ).toEqual([]);
  });

  // AC-SP3-12: neither the REST API nor any key is in the browser bundle.
  test("the browser bundle carries no Supabase address nor key", () => {
    expect(findBundleLeaks(join(process.cwd(), ".next", "static"))).toEqual([]);
  });
});
