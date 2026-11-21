import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WordJumpGame } from "@/components/word-jump/word-jump-game";
import { resolveGameState, type PublicPack } from "@/lib/word-jump/game-state";

import { testPack } from "../language-packs/fixtures";

function publicPack(): PublicPack {
  const state = resolveGameState({
    status: "ok",
    pack: testPack(),
    version: 1,
    publishedAt: "2026-11-18T10:00:00+00:00",
  });
  if (state.kind !== "ready") throw new Error("fixture is not playable");
  return state.pack;
}

function optionButtons() {
  return screen
    .getAllByRole("button")
    .filter((button) => button.getAttribute("lang") === "cni");
}

/** The right option, read from the emoji's accessible name. */
function answerButton() {
  const label = screen.getByRole("img").getAttribute("aria-label");
  const pack = publicPack();
  const item = pack.themes[0].items.find((each) => each.translation === label);
  return screen.getByRole("button", { name: item?.word });
}

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("WordJumpGame", () => {
  it("starts on the theme list", () => {
    render(<WordJumpGame pack={publicPack()} />);

    expect(screen.getByRole("heading", { name: "Elige un tema" })).toBeTruthy();
  });

  // AC-SP4-11
  it("asks with three options marked with the pack's language", () => {
    render(<WordJumpGame pack={publicPack()} />);
    fireEvent.click(screen.getByRole("button", { name: /Tema de prueba/ }));

    expect(optionButtons()).toHaveLength(3);
    expect(screen.getByRole("img").getAttribute("aria-label")).toMatch(
      /de prueba$/,
    );
  });

  it("confirms a right answer, with its source, and moves on", () => {
    render(<WordJumpGame pack={publicPack()} />);
    fireEvent.click(screen.getByRole("button", { name: /Tema de prueba/ }));

    fireEvent.click(answerButton());

    expect(screen.getByRole("status").textContent).toContain("¡Correcto!");
    expect(screen.getByRole("status").textContent).toContain(
      "Fuente de prueba",
    );
    fireEvent.click(screen.getByRole("button", { name: "Seguir" }));
    expect(screen.queryByRole("button", { name: "Seguir" })).toBeNull();
  });

  // AC-SP4-4, AC-SP4b-3 (modified 2026-11-20: a miss crosses the option out)
  it("crosses a wrong option out and lets another be tried", () => {
    render(<WordJumpGame pack={publicPack()} />);
    fireEvent.click(screen.getByRole("button", { name: /Tema de prueba/ }));
    const right = answerButton();
    const wrong = optionButtons().find((button) => button !== right)!;
    const wrongWord = wrong.textContent ?? "";

    fireEvent.click(wrong);

    expect(screen.getByRole("status").textContent).toContain("No es esa");
    const crossed = screen.getByRole("button", {
      name: `${wrongWord} (tachada)`,
    });
    expect(crossed.hasAttribute("disabled")).toBe(true);
    expect(screen.queryByRole("button", { name: "Seguir" })).toBeNull();

    fireEvent.click(answerButton());
    const status = screen.getByRole("status").textContent ?? "";
    expect(status).toContain("¡Correcto!");
    expect(status).toContain("Fuente de prueba");
    expect(screen.getByLabelText(/^Puntos: 5\./)).toBeTruthy();
  });

  it("reaches the summary and can start again", () => {
    render(<WordJumpGame pack={publicPack()} />);
    fireEvent.click(screen.getByRole("button", { name: /Tema de prueba/ }));

    for (let step = 0; step < 4; step++) {
      fireEvent.click(answerButton());
      fireEvent.click(screen.getByRole("button", { name: "Seguir" }));
    }

    expect(
      screen.getByRole("heading", { name: "¡Llegaste a la meta!" }),
    ).toBeTruthy();
    expect(screen.getByText("Acertaste a la primera 4 de 4.")).toBeTruthy();
    expect(screen.getByText("40")).toBeTruthy();
    // Nothing missed, nothing to review.
    expect(
      screen.queryByRole("button", { name: "Repasar las falladas" }),
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Elegir otro tema" }));
    expect(screen.getByRole("heading", { name: "Elige un tema" })).toBeTruthy();
  });
});
