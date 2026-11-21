import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WordJumpGame } from "@/components/word-jump/word-jump-game";
import type { LanguagePack } from "@/lib/language-packs/types";
import {
  previewPack,
  resolveGameState,
  type PublicPack,
} from "@/lib/word-jump/game-state";
import { STORAGE_KEY } from "@/lib/word-jump/progress";
import { resetStore } from "@/lib/word-jump/progress-store";

import { testItem, testPack, testTheme } from "../language-packs/fixtures";

function publicPack(pack: LanguagePack = testPack()): PublicPack {
  const state = resolveGameState({
    status: "ok",
    pack,
    version: 1,
    publishedAt: "2026-11-20T10:00:00+00:00",
  });
  if (state.kind !== "ready") throw new Error("fixture is not playable");
  return state.pack;
}

function options() {
  return screen
    .getAllByRole("button")
    .filter((button) => button.hasAttribute("aria-keyshortcuts"));
}

function rightOption(): HTMLElement {
  const label = screen.getByRole("img").getAttribute("aria-label");
  const item = testTheme().items.find((each) => each.translation === label);
  return screen.getByRole("button", { name: item?.word });
}

function wrongOption(): HTMLElement {
  const right = rightOption();
  return options().find(
    (button) => button !== right && !button.hasAttribute("disabled"),
  )!;
}

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  localStorage.clear();
  resetStore();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("the platform level", () => {
  // AC-SP4b-1
  it("opens with the level drawn behind the DOM, the clue and the score", () => {
    render(<WordJumpGame pack={publicPack()} />);
    fireEvent.click(screen.getByRole("button", { name: /Tema de prueba/ }));

    const canvas = document.querySelector("canvas");
    expect(canvas?.getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByLabelText("Puntos: 0. Reto 1 de 4.")).toBeTruthy();
    expect(screen.getByRole("status")).toBeTruthy();
    expect(options()).toHaveLength(3);
  });

  // AC-SP4b-9: the touch controls are there, out of the tab order.
  it("offers touch controls that never take the keyboard focus", () => {
    render(<WordJumpGame pack={publicPack()} />);
    fireEvent.click(screen.getByRole("button", { name: /Tema de prueba/ }));

    const controls = ["◀", "▶", "⤒"].map((symbol) =>
      [...document.querySelectorAll("button")].find(
        (button) => button.textContent === symbol,
      )!,
    );
    for (const control of controls) {
      expect(control.getAttribute("tabindex")).toBe("-1");
      expect(control.closest("[aria-hidden='true']")).not.toBeNull();
      // Pressing and releasing a control never answers anything.
      fireEvent.pointerDown(control);
      fireEvent.pointerUp(control);
    }
    expect(screen.getByRole("status").textContent).toBe("");
  });

  // AC-SP4b-5
  it("ends at the finish, with the missed words to review on their own", () => {
    render(<WordJumpGame pack={publicPack()} />);
    fireEvent.click(screen.getByRole("button", { name: /Tema de prueba/ }));

    const missed = screen.getByRole("img").getAttribute("aria-label");
    fireEvent.click(wrongOption());
    for (let step = 0; step < 4; step++) {
      fireEvent.click(rightOption());
      fireEvent.click(screen.getByRole("button", { name: "Seguir" }));
    }

    expect(
      screen.getByRole("heading", { name: "¡Llegaste a la meta!" }),
    ).toBeTruthy();
    expect(screen.getByText("Acertaste a la primera 3 de 4.")).toBeTruthy();
    expect(screen.getByText("35")).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Palabras para repasar" }),
    ).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", { name: "Repasar las falladas" }),
    );
    expect(screen.getByLabelText("Puntos: 0. Reto 1 de 1.")).toBeTruthy();
    expect(screen.getByRole("img").getAttribute("aria-label")).toBe(missed);
  });

  it("pauses with the menu, and leaves the level from it", () => {
    render(<WordJumpGame pack={publicPack()} />);
    fireEvent.click(screen.getByRole("button", { name: /Tema de prueba/ }));

    const menu = screen.getByRole("button", { name: "Menú" });
    fireEvent.click(menu);
    expect(menu.getAttribute("aria-expanded")).toBe("true");
    // Keys do not answer while paused.
    fireEvent.keyDown(window, { key: "1" });
    expect(screen.getByRole("status").textContent).toBe("");

    fireEvent.click(screen.getByRole("button", { name: "Seguir jugando" }));
    expect(menu.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(menu);
    fireEvent.click(screen.getByRole("button", { name: "Elegir otro tema" }));
    expect(screen.getByRole("heading", { name: "Elige un tema" })).toBeTruthy();
  });

  // AC-SP4b-8
  it("turns the sound effects off and remembers it", () => {
    const { unmount } = render(<WordJumpGame pack={publicPack()} />);
    fireEvent.click(screen.getByRole("button", { name: /Tema de prueba/ }));

    const toggle = screen.getByRole("button", { name: /Sonido: sí/ });
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(toggle);
    expect(
      screen
        .getByRole("button", { name: /Sonido: no/ })
        .getAttribute("aria-pressed"),
    ).toBe("false");
    expect(
      JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}").settings.sound,
    ).toBe(false);

    unmount();
    render(<WordJumpGame pack={publicPack()} />);
    fireEvent.click(screen.getByRole("button", { name: /Tema de prueba/ }));
    expect(screen.getByRole("button", { name: /Sonido: no/ })).toBeTruthy();
  });

  // AC-SP4b-7
  it("offers the recording only when the word has one, and plays it on a press", () => {
    const play = vi.fn(() => Promise.resolve());
    const audio = vi.fn(function (this: { play: typeof play }) {
      this.play = play;
    });
    vi.stubGlobal("Audio", audio);
    const url = "https://example.invalid/audio/prueba.mp3";
    const pack = testPack({
      themes: [
        testTheme({
          items: testTheme().items.map((item) => ({ ...item, audio: url })),
        }),
      ],
    });

    render(<WordJumpGame pack={publicPack(pack)} />);
    fireEvent.click(screen.getByRole("button", { name: /Tema de prueba/ }));
    expect(audio).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", { name: /Escuchar la palabra/ }),
    );
    expect(audio).toHaveBeenCalledWith(url);
    expect(play).toHaveBeenCalledTimes(1);

    cleanup();
    render(<WordJumpGame pack={publicPack()} />);
    fireEvent.click(screen.getByRole("button", { name: /Tema de prueba/ }));
    expect(
      screen.queryByRole("button", { name: /Escuchar la palabra/ }),
    ).toBeNull();
  });

  // AC-SP6-10 through the level: the preview marks what is not verified.
  it("marks an unverified word in a preview, and saves nothing", () => {
    const pack = previewPack(
      testPack({
        themes: [
          testTheme({
            items: testTheme().items.map((item) =>
              testItem({ ...item, verified: false }),
            ),
          }),
        ],
      }),
    );
    expect(pack).not.toBeNull();

    render(<WordJumpGame pack={pack!} preview />);
    fireEvent.click(screen.getByRole("button", { name: /Tema de prueba/ }));
    fireEvent.click(rightOption());

    expect(screen.getByRole("status").textContent).toContain("⚠ Sin verificar");
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
