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
    ).toHaveCount(169);
  });

  // AC-M3-7: a known language without data explains itself; an unknown one 404s.
  test("explains itself for a known language with no dictionary", async ({
    page,
  }) => {
    const response = await page.goto("/diccionario/uro");

    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { level: 1, name: /diccionario uro/i }),
    ).toBeVisible();
    await expect(page.getByText(/aún no tenemos/i)).toBeVisible();
    // And offers a way out, to a language that does have one.
    await expect(page.getByRole("link", { name: /Asháninka/ })).toBeVisible();
  });

  test("404s for a language that does not exist", async ({ page }) => {
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
    await page.getByRole("button", { name: "abakerone" }).click();

    await expect(page).toHaveURL("/diccionario/ashaninka?palabra=abakerone");
    const detail = page.getByRole("region", { name: /abakerone/i });
    await expect(detail).toBeVisible();
    await expect(detail).toContainText("destinatario");
    await expect(detail).toContainText("Pisankenatero ibajiro abakerone");
  });

  // AC-M3-5 — the case most likely to break, and the one explicitly asked for.
  test("opening ?palabra directly shows that entry already open", async ({
    page,
  }) => {
    await page.goto("/diccionario/ashaninka?palabra=anamentotsipana");

    const detail = page.getByRole("region", { name: /añamentotsipana/i });
    await expect(detail).toBeVisible();
    // Both examples render.
    await expect(detail).toContainText("currículum");
    await expect(detail).toContainText("hoja de vida");
  });

  test("resolves a deep link written with the raw word", async ({ page }) => {
    await page.goto("/diccionario/ashaninka?palabra=pani");

    await expect(page.getByRole("region", { name: /pani/i })).toBeVisible();
  });

  // AC-M3-6
  test("says so when an entry has no usage examples", async ({ page }) => {
    await page.goto("/diccionario/ashaninka?palabra=pani");

    await expect(page.getByRole("region", { name: /pani/i })).toContainText(
      /no tenemos ejemplos/i,
    );
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
    ).toHaveCount(169);
  });

  // AC-M3-8
  test("the back button returns to the previously selected word", async ({
    page,
  }) => {
    await page.goto("/diccionario/ashaninka");
    await page.getByRole("button", { name: "abakerone" }).click();
    await expect(page).toHaveURL(/palabra=abakerone/);

    await page.getByRole("button", { name: "añamentotsipana" }).click();
    await expect(page).toHaveURL(/palabra=anamentotsipana/);

    await page.goBack();
    await expect(page).toHaveURL(/palabra=abakerone/);
    await expect(
      page.getByRole("region", { name: /abakerone/i }),
    ).toBeVisible();
  });

  test("closing the detail drops ?palabra from the url", async ({ page }) => {
    await page.goto("/diccionario/ashaninka?palabra=abakerone");
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

    // Real data on the official alphabet: Sh, Ts and Ty are letters of
    // their own, and there is no C, D or Z in Asháninka at all.
    await expect(headings).toHaveText([
      "A",
      "B",
      "I",
      "K",
      "M",
      "N",
      "Ñ",
      "O",
      "P",
      "S",
      "Sh",
      "T",
      "Ts",
      "Ty",
      "Y",
    ]);
  });

  test("folds an accented initial into its base letter section", async ({
    page,
  }) => {
    await page.goto("/diccionario/ashaninka");

    const sectionA = page.getByRole("group", { name: "A" });
    await expect(sectionA.getByRole("listitem")).toHaveCount(23);
  });

  test("lists words alphabetically inside a section", async ({ page }) => {
    await page.goto("/diccionario/ashaninka");

    // Plain s before sh: Spanish collation would interleave them.
    // toHaveText auto-retries; allInnerTexts() reads once and was flaky.
    const words = page
      .getByRole("group", { name: "Sh" })
      .getByRole("button")
      .filter({ hasText: /^shara|^sheki/ });

    await expect(words).toHaveText([
      /^sharakamashi —/,
      /^sharakasati —/,
      /^sheki —/,
    ]);
  });

  test("the A-Z index jumps to a section", async ({ page }) => {
    await page.goto("/diccionario/ashaninka");
    await page.getByRole("link", { name: "Ir a la letra Ts" }).click();

    await expect(page).toHaveURL(/#letra-/);
    await expect(page.getByRole("group", { name: "Ts" })).toBeInViewport();
  });

  test("the index omits letters with no entries", async ({ page }) => {
    await page.goto("/diccionario/ashaninka");

    const index = page.getByRole("navigation", { name: /índice/i });
    await expect(index.getByRole("link")).toHaveCount(15);
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
    await expect(status).toContainText("169 palabras");

    await page.getByLabel(/buscar/i).fill("sankena");

    await expect(status).toContainText("5 palabras");
    await expect(
      page.getByRole("region", { name: "Palabras" }).getByRole("listitem"),
    ).toHaveCount(5);
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
    await page.getByLabel(/buscar/i).fill("sankena");
    await expect(
      page.getByRole("region", { name: "Palabras" }).getByRole("listitem"),
    ).toHaveCount(5);

    await page.getByRole("button", { name: /limpiar/i }).click();

    await expect(page.getByLabel(/buscar/i)).toHaveValue("");
    await expect(
      page.getByRole("region", { name: "Palabras" }).getByRole("listitem"),
    ).toHaveCount(169);
  });

  // AC-M1-6 exercised through the UI: Spanish in, indigenous word out.
  test("finds a word by its Spanish translation", async ({ page }) => {
    await page.goto("/diccionario/ashaninka");
    await page.getByLabel(/buscar/i).fill("cuaderno");

    await expect(
      page.getByRole("region", { name: "Palabras" }).getByRole("listitem"),
    ).toHaveCount(2);
  });

  test("searching does not put anything in the url", async ({ page }) => {
    await page.goto("/diccionario/ashaninka");
    await page.getByLabel(/buscar/i).fill("sankena");

    await expect(page).toHaveURL("/diccionario/ashaninka");
  });
});

test.describe("language picker", () => {
  // AC-M4-1
  test("shows the active language and its entry count", async ({ page }) => {
    await page.goto("/diccionario/ashaninka");

    await expect(
      page.getByRole("button", { name: /lengua: Asháninka/i }),
    ).toContainText("169");
  });

  // AC-M4-2
  test("offers a language without a dictionary as disabled", async ({
    page,
  }) => {
    await page.goto("/diccionario/ashaninka");
    await page.getByRole("button", { name: /lengua: Asháninka/i }).click();

    const uro = page.getByRole("menuitem", { name: /Uro/ });
    await expect(uro).toBeVisible();
    await expect(uro).toContainText(/pronto/i);
    await expect(uro).toBeDisabled();
  });

  // AC-M4-4
  test("opens and closes with the keyboard", async ({ page }) => {
    await page.goto("/diccionario/ashaninka");
    await page.getByRole("button", { name: /lengua: Asháninka/i }).focus();
    await page.keyboard.press("Enter");

    await expect(page.getByRole("menu")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toBeHidden();
  });

  // AC-M4-3 — an entry id means nothing in another language.
  test("changing language drops ?palabra", async ({ page }) => {
    await page.goto("/diccionario/ashaninka?palabra=abakerone");
    await page.getByRole("button", { name: /lengua: Asháninka/i }).click();
    await page.getByRole("menuitem", { name: /Asháninka/ }).click();

    await expect(page).toHaveURL("/diccionario/ashaninka");
  });

  test("changing language clears the search box", async ({ page }) => {
    await page.goto("/diccionario/ashaninka");
    await page.getByLabel(/buscar/i).fill("sankena");
    await expect(page.getByLabel(/buscar/i)).toHaveValue("sankena");

    await page.getByRole("button", { name: /lengua: Asháninka/i }).click();
    await page.getByRole("menuitem", { name: /Asháninka/ }).click();

    await expect(page.getByLabel(/buscar/i)).toHaveValue("");
  });
});

test.describe("dictionary api", () => {
  // AC-M2-7 — Next returns this for unhandled verbs; locked in so a future
  // handler cannot start accepting writes unnoticed.
  test("rejects verbs other than GET", async ({ request }) => {
    for (const send of [
      request.post("/api/diccionario/ashaninka"),
      request.put("/api/diccionario/ashaninka"),
      request.delete("/api/diccionario/ashaninka"),
    ]) {
      expect((await send).status()).toBe(405);
    }
  });

  test("serves the language list", async ({ request }) => {
    const response = await request.get("/api/diccionario");

    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({
      languages: [{ slug: "ashaninka", name: "Asháninka", total: 169 }],
    });
  });
});

test.describe("keyboard only", () => {
  // AC-M3-9 — the whole page has to be operable without a mouse.
  test("walks from the picker through search to a word detail", async ({
    page,
  }) => {
    await page.goto("/diccionario/ashaninka");

    // Start at the picker. It is not the first tab stop any more: the site
    // header comes first, which is what we want.
    await page.getByRole("button", { name: /lengua: Asháninka/i }).focus();

    // Tab moves from there to the search box, which accepts typing.
    await page.keyboard.press("Tab");
    await expect(page.getByLabel(/buscar/i)).toBeFocused();
    await page.keyboard.type("sankena");
    await expect(
      page.getByRole("status", { name: /resultados/i }),
    ).toContainText("5 palabras");

    // Reach the first word and open it with Enter.
    await page.getByRole("button", { name: /^sankenapatotantsi/ }).focus();
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/palabra=sankenapatotantsi/);
    await expect(
      page.getByRole("region", { name: /sankenapatotantsi/i }),
    ).toBeVisible();
  });

  test("closes the detail with Enter on the close button", async ({ page }) => {
    await page.goto("/diccionario/ashaninka?palabra=abakerone");
    await page.getByRole("button", { name: /cerrar/i }).focus();
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL("/diccionario/ashaninka");
  });

  test("marks the selected word for assistive tech", async ({ page }) => {
    await page.goto("/diccionario/ashaninka?palabra=abakerone");

    await expect(
      page.getByRole("button", { name: /^abakerone/ }),
    ).toHaveAttribute("aria-current", "true");
  });

  test("tags entries and examples with the language code", async ({ page }) => {
    await page.goto("/diccionario/ashaninka?palabra=abakerone");
    const detail = page.getByRole("region", { name: /abakerone/i });

    await expect(detail.getByRole("heading", { level: 2 })).toHaveAttribute(
      "lang",
      "cni",
    );
  });

  test("the clear button is reachable and labelled", async ({ page }) => {
    await page.goto("/diccionario/ashaninka");
    await page.getByLabel(/buscar/i).fill("x");

    await expect(
      page.getByRole("button", { name: "Limpiar búsqueda" }),
    ).toBeVisible();
  });
});

test.describe("narrow screens", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("keeps the detail on screen when a word is picked", async ({ page }) => {
    await page.goto("/diccionario/ashaninka");
    await page.getByRole("button", { name: /^abakerone/ }).click();

    const detail = page.getByRole("region", { name: /abakerone/i });
    await expect(detail).toBeVisible();
    await expect(detail).toBeInViewport();
  });

  test("the list stays reachable behind the panel", async ({ page }) => {
    await page.goto("/diccionario/ashaninka?palabra=abakerone");

    await expect(
      page.getByRole("region", { name: "Palabras" }).getByRole("listitem"),
    ).toHaveCount(169);
  });

  test("the page does not scroll sideways", async ({ page }) => {
    await page.goto("/diccionario/ashaninka?palabra=anamentotsipana");

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe("site chrome", () => {
  test("the dictionary carries the site header and footer", async ({
    page,
  }) => {
    await page.goto("/diccionario/ashaninka");

    await expect(page.getByRole("banner")).toBeVisible();
    await expect(
      page.getByRole("banner").getByText("Lenguas Peruanas"),
    ).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
  });

  test("the header links back out of the dictionary", async ({ page }) => {
    await page.goto("/diccionario/ashaninka");
    await page
      .getByRole("banner")
      .getByRole("link", { name: "Historias" })
      .click();

    await expect(page).not.toHaveURL(/diccionario/);
  });

  test("a letter heading stays clear of the sticky site header", async ({
    page,
  }) => {
    await page.goto("/diccionario/ashaninka");
    await page.getByRole("link", { name: "Ir a la letra Ts" }).click();

    const heading = page
      .getByRole("group", { name: "Ts" })
      .getByRole("heading");
    const header = page.getByRole("banner");
    const headingBox = await heading.boundingBox();
    const headerBox = await header.boundingBox();

    expect(headingBox).not.toBeNull();
    expect(headerBox).not.toBeNull();
    // The heading must start below where the site header ends.
    expect(headingBox!.y).toBeGreaterThanOrEqual(
      headerBox!.y + headerBox!.height - 1,
    );
  });
});
