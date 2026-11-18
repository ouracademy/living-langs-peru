import { imageSize } from "image-size";
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

// AC-E3-1, AC-E3-2: the photo leaves the browser reduced and re-encoded.
// The save is intercepted, so nothing reaches GitHub; the page reads the
// gallery from tests/e2e/fake-github.mjs.
test("the form sends a reduced JPEG with every field and the sha", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    httpCredentials: { username: "e2e-editor", password: "e2e-not-a-secret" },
  });
  const page = await context.newPage();

  let sent: FormData | undefined;
  await page.route("**/api/admin/fotos", async (route) => {
    const request = route.request();
    if (request.method() !== "POST") return route.continue();
    const raw = request.postDataBuffer();
    if (!raw) throw new Error("the save was sent without a body");
    // Node parses the multipart body the same way the Route Handler does.
    sent = await new Response(new Uint8Array(raw), {
      headers: { "content-type": request.headers()["content-type"] },
    }).formData();
    await route.fulfill({
      status: 201,
      json: {
        ok: true,
        message: "Foto guardada. Se verá en la web en 1–2 minutos.",
      },
    });
  });

  await page.goto("/admin/fotos");
  await expect(page.getByRole("main").getByRole("listitem")).toHaveCount(5);

  // A 4000×3000 PNG made in the browser: bigger than the limit on both sides.
  const png = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 4000;
    canvas.height = 3000;
    const context2d = canvas.getContext("2d");
    if (!context2d) throw new Error("no 2d context");
    context2d.fillStyle = "#c8742c";
    context2d.fillRect(0, 0, 4000, 3000);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!blob) throw new Error("toBlob failed");
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  });

  await page.getByLabel("Foto (JPEG, PNG o WebP)").setInputFiles({
    name: "grande.png",
    mimeType: "image/png",
    buffer: Buffer.from(png),
  });
  await page
    .getByLabel("Descripción (para quien no ve la foto)")
    .fill("Un campo color tierra, usado solo para probar la subida.");
  await page.getByLabel("Autor").fill("PRUEBA e2e");
  await page.getByLabel("Licencia").fill("CC0 1.0");
  await page
    .getByLabel("Dirección de origen (https://…)")
    .fill("https://example.org/prueba");
  await page.getByRole("button", { name: "Guardar foto" }).click();

  await expect(
    page.getByText(/Foto guardada\. Se verá en la web/),
  ).toBeVisible();
  expect(sent).toBeDefined();
  const photo = sent?.get("photo");
  expect(photo).toBeInstanceOf(Blob);
  const bytes = new Uint8Array(await (photo as Blob).arrayBuffer());
  const size = imageSize(bytes);
  expect((photo as Blob).type).toBe("image/jpeg");
  expect(size.type).toBe("jpg");
  expect(Math.max(size.width, size.height)).toBe(2400);
  expect(bytes.length).toBeLessThan(3 * 1024 * 1024);
  expect(sent?.get("sha")).toMatch(/^[0-9a-f]{40}$/);
  expect(sent?.get("author")).toBe("PRUEBA e2e");
  expect(sent?.get("license")).toBe("CC0 1.0");

  await context.close();
});

// AC-E3-7: ordering with the keyboard, the focus follows the moved photo.
test("a photo moves with the keyboard and keeps the focus", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    httpCredentials: { username: "e2e-editor", password: "e2e-not-a-secret" },
  });
  const page = await context.newPage();

  let sent: Record<string, string> | undefined;
  await page.route("**/api/admin/fotos", async (route) => {
    const request = route.request();
    if (request.method() !== "PATCH") return route.continue();
    sent = request.postDataJSON();
    const listed = await (
      await page.request.get("/api/admin/fotos", {
        headers: {
          authorization: `Basic ${Buffer.from("e2e-editor:e2e-not-a-secret").toString("base64")}`,
        },
      })
    ).json();
    const photos = [...listed.photos];
    [photos[0], photos[1]] = [photos[1], photos[0]];
    await route.fulfill({
      json: {
        ok: true,
        sha: "f".repeat(40),
        photos,
        message: "Orden guardado. Se verá en la web en 1–2 minutos.",
      },
    });
  });

  await page.goto("/admin/fotos");
  await page.getByRole("button", { name: "Bajar la foto 1" }).focus();
  await page.keyboard.press("Enter");

  await expect(page.getByText(/Orden guardado/)).toBeVisible();
  expect(sent).toMatchObject({ action: "move", direction: "down" });
  await expect(
    page.getByRole("button", { name: "Bajar la foto 2" }),
  ).toBeFocused();

  await context.close();
});
