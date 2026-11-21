import { readFileSync } from "node:fs";
import { join } from "node:path";

import { type Page, expect, test } from "@playwright/test";

import { findBundleLeaks } from "./bundle-leaks";

// The same fixture the fake Supabase serves: words marked PRUEBA (spec §13).
const pack = JSON.parse(
  readFileSync(join(__dirname, "fixtures", "word-jump-pack.json"), "utf8"),
) as {
  themes: {
    items: { word: string; translation: string; verified: boolean }[];
  }[];
};
const items = pack.themes[0].items;
const hidden = items.filter((item) => !item.verified).map((item) => item.word);

/** Every request the browser makes, to prove it never talks to Supabase. */
function recordRequests(page: Page): string[] {
  const urls: string[] = [];
  page.on("request", (request) => urls.push(request.url()));
  return urls;
}

/** AC-SP4-12: no 401, no sign-in, no way to /admin. */
async function expectNoLogin(page: Page) {
  await expect(page.locator('a[href^="/admin"]')).toHaveCount(0);
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
}

test.describe("Saltapalabras", () => {
  test("the library lists the languages from code, without login", async ({
    page,
  }) => {
    const response = await page.goto("/juegos/saltapalabras");

    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("link", { name: "Jugar en Asháninka" }),
    ).toBeVisible();
    await expect(page.getByText(/no tiene hablantes/)).toBeVisible();
    await expectNoLogin(page);
  });

  // AC-SP4-9
  test("uro answers 200 and explains why there is no game", async ({
    page,
  }) => {
    const response = await page.goto("/juegos/saltapalabras/uro");

    expect(response?.status()).toBe(200);
    await expect(page.getByText(/no tiene hablantes/)).toBeVisible();
    await expectNoLogin(page);
  });

  // AC-SP4-10
  test("an unknown language is a 404", async ({ page }) => {
    const response = await page.goto("/juegos/saltapalabras/klingon");

    expect(response?.status()).toBe(404);
  });

  // AC-SP4-2, AC-SP4-3, AC-SP4-12, AC-SP4-13
  test("a whole pic2word round, from the published pack to the summary", async ({
    page,
  }) => {
    const requests = recordRequests(page);
    const statuses: number[] = [];
    page.on("response", (response) => statuses.push(response.status()));

    await page.goto("/juegos/saltapalabras/ashaninka");
    await expectNoLogin(page);
    await page.getByRole("button", { name: /Tema de prueba/ }).click();

    for (let step = 0; step < 4; step++) {
      const label = await page
        .locator("main")
        .getByRole("img")
        .getAttribute("aria-label");
      const item = items.find((each) => each.translation === label);
      expect(item, `no item for ${label}`).toBeTruthy();

      await page.getByRole("button", { name: item!.word, exact: true }).click();
      await expect(page.getByRole("status")).toContainText("¡Correcto!");
      await expect(page.getByRole("status")).toContainText("Fuente de prueba");
      for (const word of hidden) {
        await expect(page.locator("main")).not.toContainText(word);
      }
      await page.getByRole("button", { name: "Seguir" }).click();
    }

    await expect(
      page.getByRole("heading", { name: "¡Llegaste a la meta!" }),
    ).toBeVisible();
    await expect(
      page.getByText("Acertaste a la primera 4 de 4."),
    ).toBeVisible();
    await expectNoLogin(page);

    expect(statuses).not.toContain(401);
    expect(
      requests.filter((url) => /\/rest\/v1|\/auth\/v1|:54329/.test(url)),
    ).toEqual([]);
  });

  // AC-SP3-12: neither the REST API nor any key is in the browser bundle.
  test("the browser bundle carries no Supabase address nor key", () => {
    expect(findBundleLeaks(join(process.cwd(), ".next", "static"))).toEqual([]);
  });
});

/** Every item of every theme of the fixture, by word. */
const allItems = (
  pack as unknown as {
    themes: { items: { word: string; translation: string }[] }[];
  }
).themes.flatMap((theme) => theme.items);

async function play(page: Page, theme: RegExp) {
  await page.goto("/juegos/saltapalabras/ashaninka");
  await page.getByRole("button", { name: theme }).click();
}

/** The key (1, 2, 3) of the right option of a pic2word challenge. */
async function rightKey(page: Page): Promise<string> {
  const label = await page
    .locator("main")
    .getByRole("img")
    .getAttribute("aria-label");
  const word = allItems.find((each) => each.translation === label)?.word;
  const names = await page
    .locator("main button[aria-keyshortcuts]")
    .allTextContents();
  return String(names.indexOf(word ?? "") + 1);
}

async function expectRightAndGoOn(page: Page) {
  await expect(page.getByRole("status")).toContainText("¡Correcto!");
  await page.getByRole("button", { name: "Seguir" }).click();
}

test.describe("Saltapalabras, the modes without audio", () => {
  // AC-SP2-1 … AC-SP2-5 through the page: one round of each mode.
  test("a word2pic round: the word is shown, the picture is chosen", async ({
    page,
  }) => {
    await play(page, /Dibujos de prueba/);
    await expect(
      page.getByRole("heading", { name: "¿Qué dibujo es?" }),
    ).toBeVisible();

    for (let step = 0; step < 3; step++) {
      const word = await page
        .locator('main [lang="cni"]')
        .first()
        .textContent();
      const item = allItems.find((each) => each.word === word);
      expect(item, `no item for ${word}`).toBeTruthy();
      await page
        .getByRole("button", { name: item!.translation, exact: true })
        .click();
      await expectRightAndGoOn(page);
    }

    await expect(
      page.getByText("Acertaste a la primera 3 de 3."),
    ).toBeVisible();
  });

  test("a first-letter round: the initial is chosen", async ({ page }) => {
    await play(page, /Letra inicial de prueba/);
    await expect(
      page.getByRole("heading", { name: "¿Con qué letra empieza?" }),
    ).toBeVisible();

    for (let step = 0; step < 2; step++) {
      // Every PRUEBA word starts with «p»; «b» is its confusable grapheme.
      await expect(
        page.getByRole("button", { name: "b", exact: true }),
      ).toBeVisible();
      await page.getByRole("button", { name: "p", exact: true }).click();
      await expectRightAndGoOn(page);
    }

    await expect(
      page.getByText("Acertaste a la primera 2 de 2."),
    ).toBeVisible();
  });

  test("a vowel round: the missing vowel is chosen", async ({ page }) => {
    await play(page, /Vocales de prueba/);
    await expect(
      page.getByRole("heading", { name: "¿Qué vocal falta?" }),
    ).toBeVisible();

    for (let step = 0; step < 2; step++) {
      const shown = (
        (await page.locator('main span[lang="cni"]').first().textContent()) ??
        ""
      ).replace("(hueco)", "");
      const vowel = ["a", "e", "i", "o"].find((candidate) =>
        allItems.some(
          (item) =>
            item.word.toLowerCase() ===
            shown.replace("＿", candidate).toLowerCase(),
        ),
      );
      expect(vowel, `no vowel completes ${shown}`).toBeTruthy();
      await page.getByRole("button", { name: vowel!, exact: true }).click();
      await expectRightAndGoOn(page);
    }

    await expect(
      page.getByText("Acertaste a la primera 2 de 2."),
    ).toBeVisible();
  });

  // AC-SP4-5, then AC-SP4-7
  test("a whole round with the keyboard alone, and the progress survives a reload", async ({
    page,
  }) => {
    await page.goto("/juegos/saltapalabras/ashaninka");
    await expect(page.getByText(/Palabras vistas: 0 de 4/)).toBeVisible();

    await page.getByRole("button", { name: /Tema de prueba/ }).focus();
    await page.keyboard.press("Enter");

    const next = page.getByRole("button", { name: "Seguir" });
    for (let step = 0; step < 30; step++) {
      if (
        await page
          .getByRole("heading", { name: "¡Llegaste a la meta!" })
          .isVisible()
      ) {
        break;
      }
      // 1, then 2, then 3: a wrong key crosses its option out (AC-SP4-4).
      for (const key of ["1", "2", "3"]) {
        await page.keyboard.press(key);
        if (await next.isVisible()) break;
      }
      await expect(next).toBeFocused();
      await page.keyboard.press("Enter");
    }

    await expect(
      page.getByRole("heading", { name: "¡Llegaste a la meta!" }),
    ).toBeVisible();

    await page.reload();
    await expect(page.getByText(/Palabras vistas: 4 de 4/)).toBeVisible();
  });

  // AC-SP4-6
  test("with reduced motion the character does not jump", async ({ page }) => {
    await page.addInitScript(() => {
      const original = window.requestAnimationFrame.bind(window);
      (window as unknown as { frames_: number }).frames_ = 0;
      window.requestAnimationFrame = (callback) => {
        (window as unknown as { frames_: number }).frames_ += 1;
        return original(callback);
      };
    });
    const framesAfterAnswer = async () => {
      await play(page, /Tema de prueba/);
      const before = await page.evaluate(
        () => (window as unknown as { frames_: number }).frames_,
      );
      await page.keyboard.press(await rightKey(page));
      await expect(page.getByRole("button", { name: "Seguir" })).toBeFocused();
      await page.waitForTimeout(300);
      return (
        (await page.evaluate(
          () => (window as unknown as { frames_: number }).frames_,
        )) - before
      );
    };

    expect(await framesAfterAnswer()).toBeGreaterThan(0);
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(await framesAfterAnswer()).toBe(0);
  });
});

test.describe("Saltapalabras, the platform level", () => {
  // AC-SP4b-2 with physics: run under the first cloud and jump into it.
  test("Pip runs and jumps with the keyboard, and a cloud answers", async ({
    page,
  }) => {
    await play(page, /Tema de prueba/);
    await expect(page.getByLabel("Puntos: 0. Reto 1 de 4.")).toBeVisible();

    await page.keyboard.down("ArrowRight");
    await page.waitForTimeout(820);
    await page.keyboard.up("ArrowRight");
    await page.keyboard.down("ArrowUp");
    await page.waitForTimeout(450);
    await page.keyboard.up("ArrowUp");

    await expect(page.getByRole("status")).toContainText(
      /¡Correcto!|No es esa/,
    );
  });

  // AC-SP4b-9
  test("fits a 360 px phone, with touch controls of 44 px or more", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await play(page, /Tema de prueba/);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    for (const symbol of ["◀", "▶", "⤒"]) {
      const box = await page
        .locator("button", { hasText: symbol })
        .boundingBox();
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
  });

  // AC-SP4b-10: the game's code is downloaded by the game route only.
  test("no other page downloads the game", async ({ page }) => {
    const scripts: Promise<string>[] = [];
    page.on("response", (response) => {
      if (response.url().endsWith(".js")) scripts.push(response.text());
    });

    await page.goto("/");
    await page.goto("/juegos/completar-palabras/ashaninka");
    const bodies = await Promise.all(scripts);
    expect(bodies.some((body) => body.includes("Repasar las falladas"))).toBe(
      false,
    );
  });
});

test.describe("Saltapalabras in the home page", () => {
  // Spec §14, question 5 (closed 2026-11-18): listed with the other game.
  test("the games card of the education section leads to the library", async ({
    page,
  }) => {
    await page.goto("/");
    await page
      .locator("#educacion")
      .getByRole("link", { name: /Saltapalabras/ })
      .click();

    await expect(page).toHaveURL("/juegos/saltapalabras");
    await expect(
      page.getByRole("link", { name: "Jugar en Asháninka" }),
    ).toBeVisible();
  });
});

type Said = { kind: "voice"; text: string; lang: string } | { kind: "audio" };

/**
 * Replaces the browser voice and Audio with doubles that write down what was
 * asked (spec §7.7): headless Chromium has no voice to listen to.
 */
async function recordSpeech(page: Page) {
  await page.addInitScript(() => {
    const said: unknown[] = [];
    (window as unknown as { __said: unknown[] }).__said = said;
    class Utterance {
      lang = "";
      voice: unknown = null;
      constructor(public text: string) {}
    }
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      configurable: true,
      value: Utterance,
    });
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        getVoices: () => [{ lang: "es-PE", name: "Prueba" }],
        speak: (utterance: Utterance) =>
          said.push({
            kind: "voice",
            text: utterance.text,
            lang: utterance.lang,
          }),
        cancel: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      },
    });
    Object.defineProperty(window, "Audio", {
      configurable: true,
      value: class {
        constructor() {
          said.push({ kind: "audio" });
        }
        play() {
          return Promise.resolve();
        }
        pause() {}
      },
    });
  });
}

const said = (page: Page) =>
  page.evaluate(() => (window as unknown as { __said: Said[] }).__said);

/** The word of the pic2word challenge on screen, from its picture's name. */
async function currentWord(page: Page): Promise<string> {
  const label = await page
    .locator("main")
    .getByRole("img")
    .getAttribute("aria-label");
  return allItems.find((each) => each.translation === label)?.word ?? "";
}

test.describe("Saltapalabras, the words sound", () => {
  // AC-SP4c-2, AC-SP4c-3, AC-SP4c-6
  test("the word sounds when Pip reaches the clouds, once, and not before a gesture", async ({
    page,
  }) => {
    await recordSpeech(page);
    await play(page, /Tema de prueba/);
    const word = await currentWord(page);

    await page.waitForTimeout(600);
    expect(await said(page)).toEqual([]);

    await page.keyboard.down("ArrowRight");
    await page.waitForTimeout(400);
    await page.keyboard.up("ArrowRight");
    await expect
      .poll(() => said(page))
      .toEqual([{ kind: "voice", text: word, lang: "es-PE" }]);

    await page.keyboard.down("ArrowLeft");
    await page.waitForTimeout(300);
    await page.keyboard.up("ArrowLeft");
    await page.keyboard.down("ArrowRight");
    await page.waitForTimeout(300);
    await page.keyboard.up("ArrowRight");
    expect(await said(page)).toHaveLength(1);
  });

  // AC-SP4c-2, AC-SP4c-3
  test("the word sounds after a right answer and on 🔊, with the notice", async ({
    page,
  }) => {
    await recordSpeech(page);
    await play(page, /Tema de prueba/);
    const word = await currentWord(page);
    await expect(page.getByText(/Pronunciación aproximada/)).toBeVisible();

    await page.getByRole("button", { name: /Escuchar la palabra/ }).click();
    await expect
      .poll(() => said(page))
      .toEqual([{ kind: "voice", text: word, lang: "es-PE" }]);

    await page.keyboard.press(await rightKey(page));
    await expect(page.getByRole("status")).toContainText("¡Correcto!");
    await expect.poll(async () => (await said(page)).length).toBe(2);
    expect((await said(page))[1]).toEqual({
      kind: "voice",
      text: word,
      lang: "es-PE",
    });
    // No word of this theme has a recording: Audio is never asked for.
    expect((await said(page)).some((entry) => entry.kind === "audio")).toBe(
      false,
    );
  });

  // AC-SP4c-4
  test("with «Voz aproximada: no» nothing is spoken, and it is remembered", async ({
    page,
  }) => {
    await recordSpeech(page);
    await play(page, /Tema de prueba/);
    await page.getByRole("button", { name: /Menú/ }).click();
    await page.getByRole("button", { name: /Voz aproximada: sí/ }).click();
    await page.getByRole("button", { name: "Seguir jugando" }).click();

    await expect(
      page.getByRole("button", { name: /Escuchar la palabra/ }),
    ).toBeDisabled();
    await page.keyboard.press(await rightKey(page));
    await expect(page.getByRole("status")).toContainText("¡Correcto!");
    await page.waitForTimeout(700);
    expect(await said(page)).toEqual([]);

    await play(page, /Tema de prueba/);
    await page.getByRole("button", { name: /Menú/ }).click();
    await expect(
      page.getByRole("button", { name: /Voz aproximada: no/ }),
    ).toBeVisible();
  });
});
