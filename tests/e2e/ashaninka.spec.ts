import { expect, test } from "@playwright/test";

test("the home page's «Explorar Asháninka» button reaches the people page", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Explorar Asháninka" }).click();

  await expect(page).toHaveURL(/\/ashaninka$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Asháninka" }),
  ).toBeVisible();
});

test("the page is titled after the people", async ({ page }) => {
  const response = await page.goto("/ashaninka");

  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/Pueblo Asháninka/);
});

// The 2017 census yields three different numbers. Showing one of them as "the
// Asháninka population" would be factually wrong, so each gets its own label
// and its own note. See spec §5.3 and AC-M2-3.
test("the three census figures are shown separately, each with its own label", async ({
  page,
}) => {
  await page.goto("/ashaninka");

  const population = page.getByRole("region", { name: "Población" });

  for (const [label, value] of [
    ["Población en sus localidades", /118\s*277/],
    ["Se autoidentifican como asháninka", /55\s*493/],
    ["Aprendieron asháninka en la niñez", /73\s*567/],
  ] as const) {
    const term = population.getByText(label, { exact: false });

    await expect(term).toBeVisible();
    await expect(population.getByText(value)).toBeVisible();
  }
});

test("each census figure explains what it measures", async ({ page }) => {
  await page.goto("/ashaninka");

  await expect(
    page.getByText(/Personas que viven en las 675 localidades/),
  ).toBeVisible();
  await expect(
    page.getByText(/Autoidentificación a nivel nacional/),
  ).toBeVisible();
  await expect(page.getByText(/Lengua materna declarada/)).toBeVisible();
});
