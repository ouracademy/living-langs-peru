import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { HelpEducation } from "@/components/help-education";

afterEach(cleanup);

/** The «Juegos» card, found by its heading. */
function gamesCard() {
  const heading = screen.getByRole("heading", { name: "Juegos" });
  return within(heading.parentElement as HTMLElement);
}

describe("HelpEducation", () => {
  it("lists Saltapalabras in the games card, linking to its library", () => {
    render(<HelpEducation />);

    expect(
      gamesCard()
        .getByRole("link", { name: /Saltapalabras/ })
        .getAttribute("href"),
    ).toBe("/juegos/saltapalabras");
  });

  it("keeps completar-palabras in the same card (AC-G4-16)", () => {
    render(<HelpEducation />);

    expect(
      gamesCard()
        .getByRole("link", { name: /Aprende jugando/ })
        .getAttribute("href"),
    ).toBe("/juegos/completar-palabras/ashaninka");
  });

  it("never sends the games card to /admin or a sign-in", () => {
    render(<HelpEducation />);

    for (const link of gamesCard().getAllByRole("link")) {
      expect(link.getAttribute("href")).not.toMatch(/^\/admin|ingresar/);
    }
  });
});
