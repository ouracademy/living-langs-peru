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
