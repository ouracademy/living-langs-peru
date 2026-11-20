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
// The save is intercepted, so nothing is stored: the fake Supabase
// (tests/e2e/fake-supabase.mjs) is shared by tests running in parallel. The
// page reads the gallery from it: no row yet, so the repo's five photos.
test("the form sends a reduced JPEG with every field and the version", async ({
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
        message: "Foto guardada. Ya está en la galería.",
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

  await page.getByRole("button", { name: "Agregar foto" }).click();
  await page.getByLabel(/Elige una foto/).setInputFiles({
    name: "grande.png",
    mimeType: "image/png",
    buffer: Buffer.from(png),
  });
  // UI-4: the photo is shown already reduced, with its final size.
  await expect(
    page.getByText(/2400 × 1800 px · [\d,]+ MB · JPEG/),
  ).toBeVisible();
  await expect(page.getByText(/datos de ubicación \(GPS\)/)).toBeVisible();
  await page
    .getByLabel("Descripción (para quien no ve la foto)")
    .fill("Un campo color tierra, usado solo para probar la subida.");
  await page.getByLabel("Autor").fill("PRUEBA e2e");
  await page.getByLabel("Licencia", { exact: true }).fill("CC0 1.0");
  await page
    .getByLabel(/Dirección de origen/)
    .fill("https://example.org/prueba");
  await page.getByRole("button", { name: "Guardar foto" }).click();

  await expect(
    page.getByText(/Foto guardada\. Ya está en la galería/),
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
  // No row yet in the fake: the first save starts from version 0.
  expect(sent?.get("version")).toBe("0");
  expect(sent?.has("sha")).toBe(false);
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
        version: 1,
        photos,
        message: "Orden guardado. Ya está en la galería.",
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

const editor = { username: "e2e-editor", password: "e2e-not-a-secret" };

// UI-3: the drop zone is a real file input, so the keyboard opens the picker.
test("the keyboard opens the photo picker", async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    baseURL,
    httpCredentials: editor,
  });
  const page = await context.newPage();
  await page.goto("/admin/fotos");
  await page.getByRole("button", { name: "Agregar foto" }).click();

  await page.getByLabel(/Elige una foto/).focus();
  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.keyboard.press("Space"),
  ]);
  expect(chooser.isMultiple()).toBe(false);

  await context.close();
});

// UI-16: on a 360 px phone nothing scrolls sideways and every button can be
// hit with a thumb (44 × 44 px at least).
test("the editor fits a phone and its buttons are big enough", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    httpCredentials: editor,
    viewport: { width: 360, height: 740 },
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto("/admin/fotos");
  await page.getByRole("button", { name: "Agregar foto" }).click();
  await page.getByLabel(/Elige una foto/).setInputFiles({
    name: "chica.png",
    mimeType: "image/png",
    // A 1×1 PNG: enough to show the preview and the rest of the form.
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    ),
  });
  await expect(page.getByText(/Se guardará así/)).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);

  const small = await page
    .getByRole("main")
    .getByRole("button")
    .evaluateAll((buttons) =>
      buttons
        .filter((button) => (button as HTMLElement).offsetParent !== null)
        .map((button) => {
          const box = button.getBoundingClientRect();
          return {
            name:
              button.getAttribute("aria-label") ??
              button.textContent?.trim() ??
              "",
            width: Math.round(box.width),
            height: Math.round(box.height),
          };
        })
        .filter((box) => box.width < 44 || box.height < 44),
    );
  expect(small).toEqual([]);

  await context.close();
});
