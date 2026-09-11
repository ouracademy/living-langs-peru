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
    await expect(
      page.getByRole("region", { name: "Palabras" }).getByRole("listitem"),
    ).toHaveCount(13);
  });

  test("warns that the content is still provisional", async ({ page }) => {
    await page.goto("/diccionario/ashaninka");

    await expect(
      page.getByText(/estas entradas son de andamiaje/i),
    ).toBeVisible();
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

test.describe("word selection and deep links", () => {
  // AC-M3-4
  test("clicking a word shows its detail and puts it in the url", async ({
    page,
  }) => {
    await page.goto("/diccionario/ashaninka");
    await page.getByRole("button", { name: "Placeholder A" }).click();

    await expect(page).toHaveURL(
      "/diccionario/ashaninka?palabra=placeholder-a",
    );
    const detail = page.getByRole("region", { name: /placeholder a/i });
    await expect(detail).toBeVisible();
    await expect(detail).toContainText("contenido provisional");
    await expect(detail).toContainText(
      "Oración de ejemplo pendiente de fuente citada.",
    );
  });

  // AC-M3-5 — the case most likely to break, and the one explicitly asked for.
  test("opening ?palabra directly shows that entry already open", async ({
    page,
  }) => {
    await page.goto("/diccionario/ashaninka?palabra=placeholder-c");

    const detail = page.getByRole("region", { name: /placeholder c/i });
    await expect(detail).toBeVisible();
    // Both examples render.
    await expect(detail).toContainText("Primera oración de ejemplo pendiente.");
    await expect(detail).toContainText("Segunda oración de ejemplo pendiente.");
  });

  test("resolves a deep link written with the raw word", async ({ page }) => {
    await page.goto("/diccionario/ashaninka?palabra=Placeholder%20B");

    await expect(
      page.getByRole("region", { name: /placeholder b/i }),
    ).toBeVisible();
  });

  // AC-M3-6
  test("says so when an entry has no usage examples", async ({ page }) => {
    await page.goto("/diccionario/ashaninka?palabra=placeholder-b");

    await expect(
      page.getByRole("region", { name: /placeholder b/i }),
    ).toContainText(/no tenemos ejemplos/i);
  });

  // AC-M3-7 — a shared link that misses must not land on an error page.
  test("warns without 404ing when ?palabra matches nothing", async ({
    page,
  }) => {
    const response = await page.goto("/diccionario/ashaninka?palabra=basura");

    expect(response?.status()).toBe(200);
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      /no encontramos esa palabra/i,
    );
    await expect(
      page.getByRole("region", { name: "Palabras" }).getByRole("listitem"),
    ).toHaveCount(13);
  });

  // AC-M3-8
  test("the back button returns to the previously selected word", async ({
    page,
  }) => {
    await page.goto("/diccionario/ashaninka");
    await page.getByRole("button", { name: "Placeholder A" }).click();
    await expect(page).toHaveURL(/palabra=placeholder-a/);

    await page.getByRole("button", { name: "Placeholder C" }).click();
    await expect(page).toHaveURL(/palabra=placeholder-c/);

    await page.goBack();
    await expect(page).toHaveURL(/palabra=placeholder-a/);
    await expect(
      page.getByRole("region", { name: /placeholder a/i }),
    ).toBeVisible();
  });

  test("closing the detail drops ?palabra from the url", async ({ page }) => {
    await page.goto("/diccionario/ashaninka?palabra=placeholder-a");
    await page.getByRole("button", { name: /cerrar/i }).click();

    await expect(page).toHaveURL("/diccionario/ashaninka");
  });
});

test.describe("alphabetical grouping", () => {
  // AC-M3-2
  test("shows one section per initial letter, in order", async ({ page }) => {
    await page.goto("/diccionario/ashaninka");

    const headings = page
      .getByRole("region", { name: "Palabras" })
      .getByRole("heading", { level: 2 });

    await expect(headings).toHaveText([
      "A",
      "B",
      "C",
      "D",
      "N",
      "Ñ",
      "O",
      "P",
      "Z",
      "#",
    ]);
  });

  test("folds an accented initial into its base letter section", async ({
    page,
  }) => {
    await page.goto("/diccionario/ashaninka");

    // A-placeholder-01 and Á-placeholder-02 share the "A" section.
    const sectionA = page.getByRole("group", { name: "A" });
    await expect(sectionA.getByRole("listitem")).toHaveCount(2);
  });

  test("lists words alphabetically inside a section", async ({ page }) => {
    await page.goto("/diccionario/ashaninka");

    const words = await page
      .getByRole("group", { name: "P" })
      .getByRole("button")
      .allInnerTexts();

    expect(words.map((text) => text.split(" —")[0])).toEqual([
      "Placeholder A",
      "Placeholder B",
      "Placeholder C",
    ]);
  });

  test("the A-Z index jumps to a section", async ({ page }) => {
    await page.goto("/diccionario/ashaninka");
    await page.getByRole("link", { name: "Ir a la letra Ñ" }).click();

    await expect(page).toHaveURL(/#letra-/);
    await expect(page.getByRole("group", { name: "Ñ" })).toBeInViewport();
  });

  test("the index omits letters with no entries", async ({ page }) => {
    await page.goto("/diccionario/ashaninka");

    const index = page.getByRole("navigation", { name: /índice/i });
    await expect(index.getByRole("link")).toHaveCount(10);
    await expect(
      index.getByRole("link", { name: "Ir a la letra Q" }),
    ).toHaveCount(0);
  });
});

test.describe("search", () => {
  // AC-M3-3
  test("filters the list and updates the result count", async ({ page }) => {
    await page.goto("/diccionario/ashaninka");
    const status = page.getByRole("status", { name: /resultados/i });
    await expect(status).toContainText("13 palabras");

    await page.getByLabel(/buscar/i).fill("placeholder-0");

    await expect(status).toContainText("9 palabras");
    await expect(
      page.getByRole("region", { name: "Palabras" }).getByRole("listitem"),
    ).toHaveCount(9);
  });

  test("announces when nothing matches", async ({ page }) => {
    await page.goto("/diccionario/ashaninka");
    await page.getByLabel(/buscar/i).fill("zzzznomatch");

    await expect(
      page.getByRole("status", { name: /resultados/i }),
    ).toContainText("Sin resultados");
    await expect(
      page.getByRole("region", { name: "Palabras" }).getByRole("listitem"),
    ).toHaveCount(0);
  });

  test("clearing the search restores the full list", async ({ page }) => {
    await page.goto("/diccionario/ashaninka");
    await page.getByLabel(/buscar/i).fill("placeholder-0");
    await expect(
      page.getByRole("region", { name: "Palabras" }).getByRole("listitem"),
    ).toHaveCount(9);

    await page.getByRole("button", { name: /limpiar/i }).click();

    await expect(page.getByLabel(/buscar/i)).toHaveValue("");
    await expect(
      page.getByRole("region", { name: "Palabras" }).getByRole("listitem"),
    ).toHaveCount(13);
  });

  // AC-M1-6 exercised through the UI: Spanish in, indigenous word out.
  test("finds a word by its Spanish translation", async ({ page }) => {
    await page.goto("/diccionario/ashaninka");
    await page.getByLabel(/buscar/i).fill("provisional");

    await expect(
      page.getByRole("region", { name: "Palabras" }).getByRole("listitem"),
    ).toHaveCount(13);
  });

  test("searching does not put anything in the url", async ({ page }) => {
    await page.goto("/diccionario/ashaninka");
    await page.getByLabel(/buscar/i).fill("placeholder-0");

    await expect(page).toHaveURL("/diccionario/ashaninka");
  });
});
