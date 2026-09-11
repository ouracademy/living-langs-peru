import { expect, test } from "@playwright/test";

test("the home page renders", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole("heading", { name: /elige una lengua/i }),
  ).toBeVisible();
});
