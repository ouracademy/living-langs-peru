import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PackReadResult } from "@/lib/language-packs/types";

import { testItem, testPack, testTheme } from "../language-packs/fixtures";

const getGamePack = vi.fn<(language: string) => Promise<PackReadResult>>();
vi.mock("@/lib/language-bundles/game-pack", () => ({ getGamePack }));

class NotFound extends Error {}
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new NotFound("NEXT_NOT_FOUND");
  },
}));

const {
  default: WordJumpPage,
  generateMetadata,
  generateStaticParams,
  revalidate,
} = await import("@/app/juegos/saltapalabras/[lengua]/page");
const { default: WordJumpLibraryPage } =
  await import("@/app/juegos/saltapalabras/page");
const { default: WordJumpError } =
  await import("@/app/juegos/saltapalabras/[lengua]/error");

function params(lengua: string) {
  return { params: Promise.resolve({ lengua }) };
}

beforeEach(() => {
  getGamePack.mockReset();
  // jsdom has no canvas; the game must not need one.
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("/juegos/saltapalabras/[lengua] route config", () => {
  // AC-L3-3: both languages are prerendered, and revalidated hourly.
  it("prerenders both languages and revalidates hourly", () => {
    expect(generateStaticParams()).toEqual([
      { lengua: "ashaninka" },
      { lengua: "uro" },
    ]);
    expect(revalidate).toBe(3600);
  });

  it("names the page after the language", async () => {
    expect(await generateMetadata(params("ashaninka"))).toEqual({
      title: "Saltapalabras en Asháninka",
    });
    expect(await generateMetadata(params("klingon"))).toEqual({
      title: "Juego no encontrado",
    });
  });
});

describe("/juegos/saltapalabras/[lengua]", () => {
  // AC-SP4-10
  it("is a 404 for a language the site does not know", async () => {
    await expect(WordJumpPage(params("klingon"))).rejects.toThrow(NotFound);
    expect(getGamePack).not.toHaveBeenCalled();
  });

  // AC-L3-3: uro works like asháninka; with nothing published it says so.
  it("says there is no content yet for a language with nothing published", async () => {
    getGamePack.mockResolvedValue({ status: "none" });

    render(await WordJumpPage(params("uro")));

    expect(getGamePack).toHaveBeenCalledWith("uro");
    expect(
      screen.getByText("Todavía no hay contenido publicado para esta lengua."),
    ).toBeTruthy();
  });

  // AC-SP4-8
  it("says the game is not available without configuration", async () => {
    getGamePack.mockResolvedValue({ status: "unconfigured" });

    render(await WordJumpPage(params("ashaninka")));

    expect(screen.getByText(/no está disponible/)).toBeTruthy();
    const link = screen.getByRole("link", { name: "Completar palabras" });
    expect(link.getAttribute("href")).toBe(
      "/juegos/completar-palabras/ashaninka",
    );
  });

  // AC-SP4-3
  it("offers the playable themes, without unverified items", async () => {
    const base = testTheme();
    getGamePack.mockResolvedValue({
      status: "ok",
      pack: testPack({
        themes: [
          testTheme({
            items: [
              ...base.items,
              testItem({
                id: "oculto",
                word: "PRUEBA oculta",
                verified: false,
              }),
            ],
          }),
        ],
      }),
      version: 4,
      publishedAt: "2026-11-18T10:00:00+00:00",
    });

    const { container } = render(await WordJumpPage(params("ashaninka")));

    expect(screen.getByRole("button", { name: /Tema de prueba/ })).toBeTruthy();
    expect(screen.getByText("Fuente de prueba")).toBeTruthy();
    expect(screen.getByText("Versión 4")).toBeTruthy();
    expect(container.textContent).not.toContain("PRUEBA oculta");
  });

  it("shows no version for the repo's content, which has none", async () => {
    getGamePack.mockResolvedValue({
      status: "ok",
      pack: testPack(),
      version: 0,
      publishedAt: "",
    });

    const { container } = render(await WordJumpPage(params("ashaninka")));

    expect(container.textContent).not.toContain("Versión");
  });

  // AC-SP4-12: no way in from the game.
  it("never links to /admin nor shows a sign-in", async () => {
    getGamePack.mockResolvedValue({
      status: "ok",
      pack: testPack(),
      version: 1,
      publishedAt: "2026-11-18T10:00:00+00:00",
    });

    const { container } = render(await WordJumpPage(params("ashaninka")));

    expect(container.querySelector('a[href^="/admin"]')).toBeNull();
    expect(container.querySelector('input[type="password"]')).toBeNull();
  });
});

describe("/juegos/saltapalabras", () => {
  it("links every language from code, uro included (spec gestor-lenguas #11)", () => {
    render(<WordJumpLibraryPage />);

    for (const [name, slug] of [
      ["Asháninka", "ashaninka"],
      ["Uro", "uro"],
    ]) {
      expect(
        screen
          .getByRole("link", { name: `Jugar en ${name}` })
          .getAttribute("href"),
      ).toBe(`/juegos/saltapalabras/${slug}`);
    }
  });
});

describe("error.tsx", () => {
  // AC-SP4-8: a first visit that fails is a page, not a blank screen.
  it("says the game is not available and offers the other game", () => {
    render(<WordJumpError error={new Error("boom")} />);

    expect(
      screen.getByRole("heading", {
        name: "El juego no está disponible ahora",
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Completar palabras" }),
    ).toBeTruthy();
  });
});
