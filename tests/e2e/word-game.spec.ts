import { type Page, expect, test } from "@playwright/test";

import dictionary from "../../src/data/dictionary/ashaninka.json";
import type { Entry } from "../../src/lib/dictionary/types.ts";
import { buildItems } from "../../src/lib/game/items.ts";

// Named in English on purpose: check:language flags Spanish file names
// outside src/app, and «palabra» is on its list of domain terms.

const GAME = "/juegos/completar-palabras/ashaninka";

/**
 * The same pool the page builds. The correct answer is deliberately absent
 * from the DOM until it is revealed — otherwise a player could read it out of
 * the page — so the test works it out the same way the app does.
 */
const pool = buildItems(dictionary.entries as Entry[]);

const ANSWER = /^[^«»]+$/;

async function startLesson(page: Page) {
  await page.goto(GAME);
  // The start screen is static HTML, so wait for React to wire the button
  // rather than clicking into the void.
  await page.locator("button[data-hydrated]").click();
}

/** Clicks Continue and waits for the next item to actually be on screen. */
async function continueToNext(page: Page) {
  await page.getByRole("button", { name: "Continuar" }).click();
  // Without this the next read can still see the previous item's prompt, and
  // a "wrong" answer computed from it lands on the right tile.
  await expect(page.getByRole("status")).toBeHidden();
}

async function currentAnswer(page: Page): Promise<string> {
  // No feedback showing means the tiles belong to the item we are about to read.
  await expect(page.getByRole("status")).toBeHidden();

  const shown = (await page.getByTestId("prompt").textContent()) ?? "";
  const prompt = shown.replace(/^«/, "").replace(/»$/, "");
  const item = pool.find((candidate) => candidate.prompt === prompt);

  if (!item) throw new Error(`Ningún ítem con el enunciado: ${prompt}`);
  expect(item.answer).toMatch(ANSWER);

  return item.answer;
}

async function answerCorrectly(page: Page) {
  const answer = await currentAnswer(page);

  await page
    .locator("[aria-keyshortcuts]")
    .filter({ hasText: new RegExp(`^\\d?\\s*${answer}$`) })
    .click();
}

async function answerWrongly(page: Page) {
  const answer = await currentAnswer(page);

  await page
    .locator("[aria-keyshortcuts]")
    .filter({ hasNotText: answer })
    .first()
    .click();
}

test.describe("the lesson", () => {
  test("redirects to the only playable language", async ({ page }) => {
    await page.goto("/juegos/completar-palabras");

    await expect(page).toHaveURL(GAME);
  });

  test("starts from a static screen that needs no JavaScript", async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(GAME);

    // AC-G4-3: the start screen is in the prerendered HTML.
    await expect(
      page.getByRole("button", { name: "Empezar lección" }),
    ).toBeVisible();

    await context.close();
  });

  test("shows a prompt, a sentence with a gap and three options", async ({
    page,
  }) => {
    await startLesson(page);

    await expect(page.getByText("espacio en blanco")).toBeAttached();
    await expect(page.locator("[aria-keyshortcuts]")).toHaveCount(3);
    await expect(page.locator('[role="progressbar"]')).toHaveAttribute(
      "aria-valuetext",
      "0 de 10",
    );
  });

  test("marks the Asháninka sentence with its own language", async ({
    page,
  }) => {
    await startLesson(page);

    await expect(page.locator('p[lang="cni"]').first()).toBeVisible();
  });

  test("credits the source of every sentence it shows", async ({ page }) => {
    await startLesson(page);
    await answerCorrectly(page);

    // AC-G5-2
    await expect(page.getByRole("status")).toContainText("Fuente:");
  });

  test("advances the bar on a correct answer", async ({ page }) => {
    await startLesson(page);
    await answerCorrectly(page);

    await expect(page.getByRole("status")).toContainText("Correcto");

    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page.locator('[role="progressbar"]')).toHaveAttribute(
      "aria-valuetext",
      "1 de 10",
    );
  });

  test("costs a life on a wrong answer and shows the right one", async ({
    page,
  }) => {
    await startLesson(page);
    const answer = await currentAnswer(page);
    await answerWrongly(page);

    const feedback = page.getByRole("status");

    await expect(feedback).toContainText("Incorrecto");
    await expect(feedback).toContainText(answer);

    await page.getByRole("button", { name: "Continuar" }).click();

    // AC-G4-6: two of three lives left, and the bar has not moved.
    await expect(page.getByText("Vidas: 2 de 3")).toBeAttached();
    await expect(page.locator('[role="progressbar"]')).toHaveAttribute(
      "aria-valuetext",
      "0 de 10",
    );
  });

  test("ends in a summary after three mistakes", async ({ page }) => {
    await startLesson(page);

    for (let mistake = 0; mistake < 3; mistake++) {
      await answerWrongly(page);
      await continueToNext(page);
    }

    // AC-G4-7
    await expect(
      page.getByRole("heading", { name: "Se acabaron las vidas" }),
    ).toBeVisible();
    await expect(page.getByText("Palabras para repasar")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Otra lección" }),
    ).toBeVisible();
  });

  test("ends in a summary when every item is answered right", async ({
    page,
  }) => {
    await startLesson(page);

    for (let asked = 0; asked < 10; asked++) {
      await answerCorrectly(page);
      await continueToNext(page);
    }

    // AC-G4-8
    await expect(
      page.getByRole("heading", { name: "Lección completada" }),
    ).toBeVisible();
    await expect(page.getByText("Acertaste 10 de 10")).toBeVisible();
  });

  test("links a missed word into the dictionary", async ({ page }) => {
    await startLesson(page);

    for (let mistake = 0; mistake < 3; mistake++) {
      await answerWrongly(page);
      await continueToNext(page);
    }

    // AC-G4-17
    await page
      .getByRole("link", { name: "ver en el diccionario" })
      .first()
      .click();

    await expect(page).toHaveURL(/\/diccionario\/ashaninka\?palabra=/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Diccionario",
    );
  });
});

test.describe("keyboard and focus", () => {
  test("plays a whole item with the keyboard only", async ({ page }) => {
    await startLesson(page);

    // AC-G4-12: the tiles answer to 1, 2 and 3.
    await page.keyboard.press("1");

    await expect(page.getByRole("status")).toBeVisible();

    // AC-G4-11: focus lands on the way forward, not on a dead button.
    await expect(page.getByRole("button", { name: "Continuar" })).toBeFocused();

    await page.keyboard.press("Enter");

    await expect(page.getByRole("status")).toBeHidden();
  });

  test("reaches the tiles with Tab", async ({ page }) => {
    await startLesson(page);

    const first = page.locator("[aria-keyshortcuts]").first();
    await first.focus();

    await expect(first).toBeFocused();

    await page.keyboard.press("Enter");

    await expect(page.getByRole("status")).toBeVisible();
  });
});

test.describe("saved progress", () => {
  test("remembers a finished lesson across a reload", async ({ page }) => {
    await startLesson(page);

    for (let asked = 0; asked < 10; asked++) {
      await answerCorrectly(page);
      await continueToNext(page);
    }

    await page.reload();

    // AC-G4-9
    await expect(page.getByText("Completaste 1 lección")).toBeVisible();
  });

  // AC-G4-10 — the case that would otherwise leave a blank page.
  test("is playable with storage blocked", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addInitScript(() => {
      const deny = () => {
        throw new DOMException("denied", "SecurityError");
      };

      Object.defineProperty(window, "localStorage", {
        configurable: true,
        value: {
          getItem: deny,
          setItem: deny,
          removeItem: deny,
          clear: deny,
          key: deny,
          length: 0,
        },
      });
    });
    const page = await context.newPage();

    await startLesson(page);

    await expect(page.locator("[aria-keyshortcuts]")).toHaveCount(3);

    await answerCorrectly(page);

    await expect(page.getByRole("status")).toContainText("Correcto");

    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page.locator('[role="progressbar"]')).toHaveAttribute(
      "aria-valuetext",
      "1 de 10",
    );

    await context.close();
  });

  test("warns once when progress cannot be saved", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addInitScript(() => {
      const deny = () => {
        throw new DOMException("denied", "SecurityError");
      };

      Object.defineProperty(window, "localStorage", {
        configurable: true,
        value: {
          getItem: deny,
          setItem: deny,
          removeItem: deny,
          clear: deny,
          key: deny,
          length: 0,
        },
      });
    });
    const page = await context.newPage();
    await page.goto(GAME);
    await page.locator("button[data-hydrated]").waitFor();

    await expect(
      page.getByText(/no nos deja guardar el progreso/i),
    ).toBeVisible();

    await context.close();
  });
});

test.describe("languages", () => {
  test("explains why uro has no game, without promising a date", async ({
    page,
  }) => {
    await page.goto("/juegos/completar-palabras/uro");

    // AC-G4-14
    await expect(
      page.getByRole("heading", { name: /completar palabras en uro/i }),
    ).toBeVisible();
    await expect(page.getByText(/no tiene hablantes desde/i)).toBeVisible();
    await expect(
      page.getByRole("link", { name: /completar palabras en asháninka/i }),
    ).toBeVisible();
  });

  test("does not know made-up languages", async ({ page }) => {
    const response = await page.goto("/juegos/completar-palabras/klingon");

    expect(response?.status()).toBe(404);
  });
});

test("the home page leads to the game", async ({ page }) => {
  await page.goto("/");

  // AC-G4-16: the «Juegos» card of the education section, which used to be
  // labelled «Games» and whose link went nowhere. Scoped to the section
  // because the hero has a button with the same words that jumps to it.
  await page
    .locator("#educacion")
    .getByRole("link", { name: /aprende jugando/i })
    .click();

  await expect(page).toHaveURL(GAME);
});
