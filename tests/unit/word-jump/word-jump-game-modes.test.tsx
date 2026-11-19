import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WordJumpGame } from "@/components/word-jump/word-jump-game";
import type { LanguagePack } from "@/lib/language-packs/types";
import { resolveGameState, type PublicPack } from "@/lib/word-jump/game-state";
import { STORAGE_KEY } from "@/lib/word-jump/progress";
import { resetStore } from "@/lib/word-jump/progress-store";

import { testPack, testTheme } from "../language-packs/fixtures";

function publicPack(pack: LanguagePack = testPack()): PublicPack {
  const state = resolveGameState({
    status: "ok",
    pack,
    version: 1,
    publishedAt: "2026-11-18T10:00:00+00:00",
  });
  if (state.kind !== "ready") throw new Error("fixture is not playable");
  return state.pack;
}

function startTheme(name: RegExp = /Tema de prueba/) {
  fireEvent.click(screen.getByRole("button", { name }));
}

/** The options of the open question, whatever their language. */
function options() {
  return screen
    .getAllByRole("button")
    .filter((button) => button.hasAttribute("aria-keyshortcuts"));
}

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  localStorage.clear();
  resetStore();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("WordJumpGame with the keyboard (AC-SP4-5)", () => {
  it("answers with 1, 2 and 3, and moves focus to «Seguir» and back", () => {
    render(<WordJumpGame pack={publicPack()} />);
    startTheme();

    expect(document.activeElement?.textContent).toBe("¿Cómo se dice?");
    expect(
      options().map((button) => button.getAttribute("aria-keyshortcuts")),
    ).toEqual(["1", "2", "3"]);

    fireEvent.keyDown(window, { key: "2" });

    expect(screen.getByRole("status").textContent).toMatch(
      /¡Correcto!|No es esa/,
    );
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Seguir" }),
    );

    // While the feedback shows, the keys do nothing.
    const status = screen.getByRole("status").textContent;
    fireEvent.keyDown(window, { key: "1" });
    expect(screen.getByRole("status").textContent).toBe(status);

    fireEvent.click(screen.getByRole("button", { name: "Seguir" }));
    expect(document.activeElement?.tagName).toBe("H3");
  });

  it("ignores other keys and keys with a modifier", () => {
    render(<WordJumpGame pack={publicPack()} />);
    startTheme();

    fireEvent.keyDown(window, { key: "4" });
    fireEvent.keyDown(window, { key: "a" });
    fireEvent.keyDown(window, { key: "1", ctrlKey: true });

    expect(screen.getByRole("status").textContent).toBe("");
  });
});

describe("WordJumpGame modes", () => {
  it("word2pic shows the word and offers pictures named by their meaning", () => {
    const pack = testPack({
      themes: [testTheme({ name: "Dibujos de prueba", mode: "word2pic" })],
    });
    render(<WordJumpGame pack={publicPack(pack)} />);
    startTheme(/Dibujos de prueba/);

    expect(
      screen.getByRole("heading", { name: "¿Qué dibujo es?" }),
    ).toBeTruthy();
    const labels = options().map((button) => button.getAttribute("aria-label"));
    expect(labels.every((label) => label?.endsWith("de prueba"))).toBe(true);
    // Pictures are not words of the language.
    expect(options().some((button) => button.hasAttribute("lang"))).toBe(false);
  });

  it("first hides the initial and reads the gap as «hueco»", () => {
    const pack = testPack({
      themes: [testTheme({ name: "Letras de prueba", mode: "first" })],
    });
    render(<WordJumpGame pack={publicPack(pack)} />);
    startTheme(/Letras de prueba/);

    expect(
      screen.getByRole("heading", { name: "¿Con qué letra empieza?" }),
    ).toBeTruthy();
    expect(screen.getByText("(hueco)")).toBeTruthy();
    expect(
      options().every((button) => button.getAttribute("lang") === "cni"),
    ).toBe(true);
  });

  it("vowel offers the vowels of the language", () => {
    const pack = testPack({
      themes: [testTheme({ name: "Vocales de prueba", mode: "vowel" })],
    });
    render(<WordJumpGame pack={publicPack(pack)} />);
    startTheme(/Vocales de prueba/);

    expect(
      screen.getByRole("heading", { name: "¿Qué vocal falta?" }),
    ).toBeTruthy();
    expect(
      options()
        .map((button) => button.textContent)
        .sort(),
    ).toEqual(["a", "e", "i", "o"]);
  });
});

describe("WordJumpGame progress (AC-SP4-7)", () => {
  function playWholeRound() {
    for (let step = 0; step < 30; step++) {
      const next = screen.queryByRole("button", { name: "Seguir" });
      if (next) {
        fireEvent.click(next);
        continue;
      }
      if (screen.queryByRole("heading", { name: "¡Ronda terminada!" })) return;
      fireEvent.click(options()[0]);
    }
  }

  it("saves the round in this browser and shows the words seen", () => {
    render(<WordJumpGame pack={publicPack()} />);
    expect(screen.getByText(/Palabras vistas: 0 de 4/)).toBeTruthy();

    startTheme();
    playWholeRound();
    fireEvent.click(screen.getByRole("button", { name: "Elegir otro tema" }));

    expect(screen.getByText(/Palabras vistas: 4 de 4/)).toBeTruthy();
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    expect(Object.keys(stored.languages.ashaninka)).toHaveLength(4);
  });

  it("still plays, and says so, when the browser keeps nothing", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    render(<WordJumpGame pack={publicPack()} />);

    expect(screen.getByText(/no nos deja guardar el progreso/)).toBeTruthy();
    startTheme();
    playWholeRound();
    expect(
      screen.getByRole("heading", { name: "¡Ronda terminada!" }),
    ).toBeTruthy();
  });
});
