import { expect, test } from "@playwright/test";

// AC-S4-1
test("the privacy page opens with its title and the nine sections", async ({
  page,
}) => {
  const response = await page.goto("/privacidad");

  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/Política de privacidad/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Política de privacidad" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { level: 2 })).toHaveCount(9);
});

test("the contact email is a mailto link", async ({ page }) => {
  await page.goto("/privacidad");

  await expect(
    page.getByRole("link", { name: "amd11dot4@gmail.com" }).first(),
  ).toHaveAttribute("href", "mailto:amd11dot4@gmail.com");
});

// AC-S4-5
test("it fits a 360 px screen without scrolling sideways", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/privacidad");

  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );

  expect(overflow).toBeLessThanOrEqual(0);
});
