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

test.describe("footnotes", () => {
  test("every claim on the page carries a citation mark", async ({ page }) => {
    await page.goto("/ashaninka");

    const marks = page.locator("sup[id^='cita-'] a");

    // Summary, language profile and one per figure.
    expect(await marks.count()).toBeGreaterThanOrEqual(7);
  });

  test("a citation mark jumps to its note, and the note leads back", async ({
    page,
  }) => {
    await page.goto("/ashaninka");

    await page.locator("sup#cita-resumen a").first().click();
    await expect(page).toHaveURL(/#nota-1$/);

    const note = page.locator("li#nota-1");
    await expect(note).toBeVisible();

    await note.getByRole("link", { name: /Volver al texto/ }).click();
    await expect(page).toHaveURL(/#cita-resumen$/);
  });

  test("each source is numbered once, however many times it is cited", async ({
    page,
  }) => {
    await page.goto("/ashaninka");

    // The BDPI is cited by the summary, the language profile and four
    // figures, and must still appear as a single note.
    await expect(page.locator("li#nota-1")).toHaveCount(1);
    await expect(
      page.locator("li#nota-1").getByRole("link", { name: /Pueblo Ashaninka/ }),
    ).toHaveAttribute("href", "https://bdpi.cultura.gob.pe/pueblos/ashaninka");
  });

  test("the notes state when each source was read and the page reviewed", async ({
    page,
  }) => {
    await page.goto("/ashaninka");

    await expect(
      page.getByText(/Consultado el 11 de septiembre de 2026/).first(),
    ).toBeVisible();
    await expect(page.getByText(/Datos actualizados al/)).toBeVisible();
  });

  test("does not cite the source that was withdrawn from the research", async ({
    page,
  }) => {
    await page.goto("/ashaninka");

    await expect(page.locator("a[href*='careashaninka.org.pe']")).toHaveCount(
      0,
    );
  });
});

test.describe("history", () => {
  test("the history section is visible and keeps a stable anchor", async ({
    page,
  }) => {
    await page.goto("/ashaninka#historia");

    const history = page.getByRole("region", { name: "Historia" });

    await expect(history).toBeVisible();
    await expect(history).toHaveAttribute("id", "historia");
    await expect(
      history.getByRole("heading", { level: 2, name: "Historia" }),
    ).toBeVisible();
    await expect(history.getByText(/familia lingüística arawak/)).toBeVisible();
  });

  test("every history paragraph carries a citation mark", async ({ page }) => {
    await page.goto("/ashaninka");

    const marks = page.locator("sup[id^='cita-parrafo-historia-'] a");

    // One per paragraph in the section, none of them written by hand.
    expect(await marks.count()).toBe(3);
  });

  // The sources give ranges and approximations rather than dates, so what the
  // reader must see next to each event is its `period` verbatim. See AC-M2-2.
  test("the timeline names each event and the period it covers", async ({
    page,
  }) => {
    await page.goto("/ashaninka");

    const timeline = page.getByRole("region", { name: "Línea de tiempo" });

    await expect(timeline).toBeVisible();

    for (const [title, period] of [
      ["Origen arawak", "Hace más de 3 000 años"],
      ["Las primeras misiones", "1635–1646"],
      ["La rebelión de Juan Santos Atahualpa", "1742–1755"],
      ["El auge del caucho", "Fines del siglo XIX e inicios del XX"],
      ["El conflicto armado interno", "1980–2000"],
    ] as const) {
      await expect(
        timeline.getByRole("heading", { level: 3, name: title }),
      ).toBeVisible();
      await expect(timeline.getByText(period, { exact: false })).toBeVisible();
    }
  });

  test("the armed conflict is reported with its figures", async ({ page }) => {
    await page.goto("/ashaninka");

    const timeline = page.getByRole("region", { name: "Línea de tiempo" });

    await expect(
      timeline.getByText(/10 000 asháninka fueron desplazados/),
    ).toBeVisible();
    await expect(
      timeline.locator("sup#cita-suceso-conflicto-armado-interno a"),
    ).toBeVisible();
  });
});

test.describe("photo gallery", () => {
  test("shows at least four photos, each with a visible credit", async ({
    page,
  }) => {
    await page.goto("/ashaninka");

    const gallery = page.getByRole("region", { name: "Galería" });
    const figures = gallery.locator("figure");

    expect(await figures.count()).toBeGreaterThanOrEqual(4);

    for (const figure of await figures.all()) {
      // Author and licence sit under the image, not in a hidden `title`.
      const credit = figure.locator("figcaption");

      await expect(credit).toBeVisible();
      await expect(credit.getByRole("link")).toHaveAttribute(
        "href",
        /commons\.wikimedia\.org/,
      );
    }
  });

  test("every image describes itself for someone who cannot see it", async ({
    page,
  }) => {
    await page.goto("/ashaninka");

    const images = page.getByRole("region", { name: "Galería" }).locator("img");

    for (const image of await images.all()) {
      const alt = (await image.getAttribute("alt")) ?? "";

      expect(alt.trim().length).toBeGreaterThan(20);
      expect(alt.trim().toLowerCase()).not.toMatch(
        /^(foto|imagen|fotografía|photo|image)\.?$/,
      );
    }
  });

  // AC-M3-7: the browser must be able to reserve each box before the file
  // arrives, or the page reflows as the gallery loads.
  test("reserves space for every image before it loads", async ({ page }) => {
    await page.goto("/ashaninka");

    const images = page.getByRole("region", { name: "Galería" }).locator("img");

    for (const image of await images.all()) {
      await expect(image).toHaveAttribute("width", /^\d+$/);
      await expect(image).toHaveAttribute("height", /^\d+$/);
    }
  });

  // AC-M3-4: the files are served from `public/`, so a broken path is a 404
  // that no type check would have caught.
  test("serves every image from this site, and all of them load", async ({
    page,
  }) => {
    const failed: string[] = [];

    page.on("response", (response) => {
      if (response.url().includes("/peoples/ashaninka/") && !response.ok()) {
        failed.push(`${response.status()} ${response.url()}`);
      }
    });

    await page.goto("/ashaninka");

    const images = page.getByRole("region", { name: "Galería" }).locator("img");

    for (const image of await images.all()) {
      await image.scrollIntoViewIfNeeded();

      await expect(image).toHaveJSProperty("complete", true);
      const natural = await image.evaluate(
        (node: HTMLImageElement) => node.naturalWidth,
      );

      expect(natural).toBeGreaterThan(0);
    }

    expect(failed).toEqual([]);
  });
});

test.describe("territory", () => {
  test("the territory section is visible and keeps a stable anchor", async ({
    page,
  }) => {
    await page.goto("/ashaninka#territorio");

    const territory = page.getByRole("region", { name: "Territorio" });

    await expect(territory).toBeVisible();
    await expect(territory).toHaveAttribute("id", "territorio");
    await expect(
      territory.getByText(/estación seca|abril a octubre/),
    ).toBeVisible();
  });

  // AC-M2-13: the map is one image with a name that lists what it highlights.
  test("the map names the six highlighted regions to a screen reader", async ({
    page,
  }) => {
    await page.goto("/ashaninka");

    const map = page.getByRole("img", { name: /Mapa del Perú/ });

    await expect(map).toBeVisible();

    const title = await map.locator("title").textContent();

    expect(title).toContain("6 regiones");
    for (const region of [
      "Ayacucho",
      "Cusco",
      "Huánuco",
      "Junín",
      "Pasco",
      "Ucayali",
    ]) {
      expect(title).toContain(region);
    }
  });

  test("exactly six departments are painted as highlighted", async ({
    page,
  }) => {
    await page.goto("/ashaninka");

    const map = page.getByRole("img", { name: /Mapa del Perú/ });

    // Every department is drawn; only the six carry the highlight colour.
    expect(await map.locator("path").count()).toBe(26);
    expect(await map.locator('path[fill="#E4572E"]').count()).toBe(6);

    for (const id of [
      "junin",
      "ucayali",
      "pasco",
      "cusco",
      "huanuco",
      "ayacucho",
    ]) {
      await expect(map.locator(`path#${id}`)).toHaveAttribute(
        "fill",
        "#E4572E",
      );
    }
  });

  // AC-M2-14: greyscale, colour blindness, or no image at all — the same
  // information has to be readable as text.
  test("the regions and rivers are also available as text", async ({
    page,
  }) => {
    await page.goto("/ashaninka");

    const territory = page.getByRole("region", { name: "Territorio" });

    for (const region of [
      "Ayacucho",
      "Cusco",
      "Huánuco",
      "Junín",
      "Pasco",
      "Ucayali",
    ]) {
      await expect(
        territory.getByRole("listitem").filter({ hasText: region }).first(),
      ).toBeVisible();
    }

    for (const river of ["Pichis", "Perené", "Ene", "Tambo", "Ucayali"]) {
      await expect(
        territory.getByRole("listitem").filter({ hasText: river }).first(),
      ).toBeVisible();
    }
  });

  test("the map credits the cartography it was built from", async ({
    page,
  }) => {
    await page.goto("/ashaninka");

    await page.locator("sup#cita-territorio a").last().click();

    const note = page.locator("li").filter({ hasText: /Natural Earth/ });

    await expect(note).toBeVisible();
    await expect(note.getByRole("link").first()).toHaveAttribute(
      "href",
      /naturalearthdata\.com/,
    );
  });
});
