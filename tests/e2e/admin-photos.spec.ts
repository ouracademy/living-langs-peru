import { expect, test } from "@playwright/test";

// The web server runs with test-only ADMIN_USER / ADMIN_PASSWORD (see
// playwright.config.ts), so a request without them gets 401, not 503.

// AC-E1-1
test("the admin page and API ask for credentials", async ({ request }) => {
  const page = await request.get("/admin/fotos");
  expect(page.status()).toBe(401);
  expect(page.headers()["www-authenticate"]).toContain("Basic");

  const api = await request.post("/api/admin/fotos", { data: {} });
  expect(api.status()).toBe(401);
});

// AC-E1-1
test("wrong credentials are refused too", async ({ request }) => {
  const response = await request.get("/admin/fotos", {
    headers: {
      authorization: `Basic ${Buffer.from("e2e-editor:otra").toString("base64")}`,
    },
  });
  expect(response.status()).toBe(401);
});

// AC-E1-4
test("public pages and assets never go through the admin check", async ({
  page,
  request,
}) => {
  for (const path of ["/", "/ashaninka"]) {
    expect((await request.get(path)).status()).toBe(200);
  }

  await page.goto("/");
  const asset = await page
    .locator('script[src^="/_next/static/"]')
    .first()
    .getAttribute("src");
  expect(asset).toMatch(/^\/_next\/static\//);
  expect((await request.get(asset ?? "")).status()).toBe(200);
});

// AC-E1-5
test("no public page links to the admin area", async ({ page }) => {
  for (const path of [
    "/",
    "/ashaninka",
    "/diccionario/ashaninka",
    "/privacidad",
  ]) {
    await page.goto(path);
    await expect(page.locator('a[href^="/admin"]')).toHaveCount(0);
  }
});
