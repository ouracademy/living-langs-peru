import { expect, test } from "@playwright/test";

test.describe("dictionary page", () => {
  // AC-M3-1
  test("/diccionario redirects to the default language", async ({ page }) => {
    await page.goto("/diccionario");

    await expect(page).toHaveURL("/diccionario/ashaninka");
  });

  // AC-M3-10
  test("the title names the language", async ({ page }) => {
    await page.goto("/diccionario/ashaninka");

    await expect(page).toHaveTitle(/Diccionario Asháninka/);
  });

  test("lists the seed entries", async ({ page }) => {
    await page.goto("/diccionario/ashaninka");

    await expect(
      page.getByRole("heading", { level: 1, name: /diccionario asháninka/i }),
    ).toBeVisible();
    await expect(page.getByRole("listitem")).toHaveCount(3);
  });

  test("warns that the content is still provisional", async ({ page }) => {
    await page.goto("/diccionario/ashaninka");

    await expect(page.getByRole("status")).toContainText(/provisional/i);
  });

  // AC-M3-7 (404 half) and AC-M1-9
  test("404s for a language with no dictionary", async ({ page }) => {
    const uro = await page.goto("/diccionario/uro");
    expect(uro?.status()).toBe(404);

    const unknown = await page.goto("/diccionario/klingon");
    expect(unknown?.status()).toBe(404);
  });
});

// AC-M3-11
test("the home page links to the dictionary", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Buscar" }).click();

  await expect(page).toHaveURL("/diccionario/ashaninka");
});
