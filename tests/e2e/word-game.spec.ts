import { expect, test } from "@playwright/test";

// Named in English on purpose: check:language flags Spanish file names
// outside src/app, and «palabra» is on its list of domain terms.

const GAME = "/juegos/completar-palabras/ashaninka";

test("redirects to the only playable language", async ({ page }) => {
  await page.goto("/juegos/completar-palabras");

  await expect(page).toHaveURL(GAME);
});

test("shows a prompt, a sentence with a gap and three options", async ({
  page,
}) => {
  await page.goto(GAME);

  await expect(
    page.getByRole("heading", { name: /completar palabras en asháninka/i }),
  ).toBeVisible();

  // The Spanish prompt is what tells the learner what the sentence means.
  await expect(page.getByText(/^«.+»$/)).toBeVisible();

  await expect(page.getByText("espacio en blanco")).toBeAttached();

  await expect(page.getByRole("button")).toHaveCount(3);
});

test("marks the Asháninka sentence with its own language", async ({ page }) => {
  await page.goto(GAME);

  // Without lang, a screen reader reads Asháninka with Spanish phonetics.
  await expect(page.locator('p[lang="cni"]').first()).toBeVisible();
});

test("does not know made-up languages", async ({ page }) => {
  const response = await page.goto("/juegos/completar-palabras/klingon");

  expect(response?.status()).toBe(404);
});
