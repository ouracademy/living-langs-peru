import { expect, test } from "@playwright/test";

// The header and footer live in the root layout, so every route gets them
// exactly once — including the ones that previously had none.
const routes = [
  "/",
  "/diccionario/ashaninka",
  "/diccionario/uro",
  "/ashaninka",
  "/lenguas/uro",
];

for (const route of routes) {
  test(`${route} renders the site chrome once`, async ({ page }) => {
    await page.goto(route);

    await expect(page.getByRole("banner")).toHaveCount(1);
    await expect(page.getByRole("contentinfo")).toHaveCount(1);
    await expect(
      page.getByRole("banner").getByText("Lenguas Peruanas"),
    ).toBeVisible();
  });
}

test("the home page still renders its sections", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /elige una lengua/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /todo lo que necesitas/i }),
  ).toBeVisible();
});

test("the colour stripe appears once, above the header", async ({ page }) => {
  await page.goto("/diccionario/ashaninka");

  const stripe = page.locator("[data-site-stripe]");
  await expect(stripe).toHaveCount(1);

  const stripeBox = await stripe.boundingBox();
  const headerBox = await page.getByRole("banner").boundingBox();
  expect(stripeBox!.y).toBeLessThan(headerBox!.y);
});
