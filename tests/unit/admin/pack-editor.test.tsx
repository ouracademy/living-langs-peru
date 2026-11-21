import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PackEditor } from "@/components/admin/pack-admin/pack-editor";
import { itemAnchor } from "@/lib/language-packs/pack-file";
import type { LanguagePack } from "@/lib/language-packs/types";

import { testItem, testPack, testTheme } from "../language-packs/fixtures";

/** Two themes sharing «PRUEBA uno» (different ids, as after an import). */
function twoThemes(): LanguagePack {
  return testPack({
    themes: [
      testTheme(),
      testTheme({
        id: "tema-letras",
        name: "Letras de prueba",
        icon: "🔤",
        mode: "first",
        items: [
          testItem({ id: "item-uno-2", verified: false }),
          testItem({
            id: "item-solo",
            word: "PRUEBA sola",
            translation: "sola de prueba",
            emoji: undefined,
            verified: false,
          }),
        ],
      }),
    ],
  });
}

let latest: LanguagePack;

function Harness({
  initial,
  keeps = true,
}: {
  initial: LanguagePack;
  keeps?: boolean;
}) {
  const [pack, setPack] = useState(initial);
  return (
    <PackEditor
      pack={pack}
      onChange={(next) => {
        latest = next;
        setPack(next);
        return keeps;
      }}
    />
  );
}

function renderEditor(initial = twoThemes(), keeps = true) {
  latest = initial;
  return render(<Harness initial={initial} keeps={keeps} />);
}

const row = (themeId: string, itemId: string) =>
  document.getElementById(itemAnchor(themeId, itemId)) as HTMLElement;
const item = (themeId: string, itemId: string) =>
  latest.themes
    .find((theme) => theme.id === themeId)
    ?.items.find((candidate) => candidate.id === itemId);

afterEach(() => {
  cleanup();
  window.location.hash = "";
});

describe("pack editor · list", () => {
  // AC-SP6b-1
  it("shows the first theme with its words and counts", () => {
    renderEditor();

    expect(screen.getByLabelText("Tema")).toHaveProperty(
      "value",
      "tema-prueba",
    );
    expect(screen.getByText(/mostrando 4 de 4/)).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
  });

  it("switches theme", () => {
    renderEditor();

    fireEvent.change(screen.getByLabelText("Tema"), {
      target: { value: "tema-letras" },
    });

    expect(screen.getByText(/mostrando 2 de 2/)).toBeTruthy();
    expect(
      within(row("tema-letras", "item-solo")).getByText(
        /Fuente: Fuente de prueba/,
      ),
    ).toBeTruthy();
  });

  // AC-SP6b-7
  it("searches and filters", () => {
    renderEditor();
    fireEvent.change(screen.getByLabelText("Tema"), {
      target: { value: "tema-letras" },
    });

    fireEvent.click(screen.getByLabelText(/Solo sin dibujo/));
    expect(screen.getAllByRole("listitem")).toHaveLength(1);

    fireEvent.click(screen.getByLabelText(/Solo sin dibujo/));
    fireEvent.change(screen.getByLabelText("Buscar palabra o traducción"), {
      target: { value: "nada que coincida" },
    });
    expect(screen.getByText(/Ninguna palabra coincide/)).toBeTruthy();
  });

  // AC-SP6b-7
  it("follows an issue link to an item hidden by another theme and a filter", () => {
    renderEditor();
    fireEvent.click(screen.getByLabelText(/Solo sin verificar/));

    act(() => {
      window.location.hash = `#${itemAnchor("tema-letras", "item-solo")}`;
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });

    expect(screen.getByLabelText("Tema")).toHaveProperty(
      "value",
      "tema-letras",
    );
    expect(
      (screen.getByLabelText(/Solo sin verificar/) as HTMLInputElement).checked,
    ).toBe(false);
    expect(document.activeElement).toBe(row("tema-letras", "item-solo"));
  });

  it("opens on the item of the link it was loaded with", () => {
    window.location.hash = `#${itemAnchor("tema-letras", "item-solo")}`;
    renderEditor();

    expect(screen.getByLabelText("Tema")).toHaveProperty(
      "value",
      "tema-letras",
    );
  });
});

describe("pack editor · editing", () => {
  // AC-SP6b-3
  it("unchecks «Verificada» in every theme with the same word", () => {
    renderEditor();

    fireEvent.click(
      screen.getByRole("checkbox", { name: "Verificada: PRUEBA uno" }),
    );

    expect(item("tema-prueba", "item-uno")?.verified).toBe(false);
    expect(item("tema-letras", "item-uno-2")?.verified).toBe(false);
    expect(screen.getByRole("status").textContent).toMatch(/sin verificar/);
  });

  // AC-SP6b-2
  it("edits the emoji and translation in the row, and focus returns to «Editar»", () => {
    renderEditor();
    const target = row("tema-prueba", "item-uno");

    fireEvent.click(
      within(target).getByRole("button", { name: "Editar «PRUEBA uno»" }),
    );
    expect(document.activeElement).toBe(
      within(target).getByLabelText("Palabra"),
    );
    fireEvent.change(within(target).getByLabelText("Dibujo (emoji)"), {
      target: { value: "🍐" },
    });
    fireEvent.change(within(target).getByLabelText("Traducción"), {
      target: { value: "uno corregido" },
    });
    fireEvent.click(within(target).getByRole("button", { name: "Guardar" }));

    expect(item("tema-prueba", "item-uno")).toMatchObject({
      emoji: "🍐",
      translation: "uno corregido",
    });
    expect(item("tema-letras", "item-uno-2")?.emoji).toBe("🍐");
    expect(document.activeElement).toBe(
      within(row("tema-prueba", "item-uno")).getByRole("button", {
        name: "Editar «PRUEBA uno»",
      }),
    );
  });

  // AC-SP6b-5
  it("does not save an empty word, and says why next to the field", () => {
    renderEditor();
    const target = row("tema-prueba", "item-dos");
    const before = latest;

    fireEvent.click(
      within(target).getByRole("button", { name: "Editar «PRUEBA dos»" }),
    );
    fireEvent.change(within(target).getByLabelText("Palabra"), {
      target: { value: "  " },
    });
    fireEvent.click(within(target).getByRole("button", { name: "Guardar" }));

    const field = within(target).getByLabelText("Palabra");
    expect(field.getAttribute("aria-invalid")).toBe("true");
    expect(within(target).getByText("Escribe la palabra.")).toBeTruthy();
    expect(latest).toBe(before);
  });

  it("cancels the edit with Escape", () => {
    renderEditor();
    const target = row("tema-prueba", "item-dos");

    fireEvent.click(
      within(target).getByRole("button", { name: "Editar «PRUEBA dos»" }),
    );
    fireEvent.keyDown(within(target).getByLabelText("Palabra"), {
      key: "Escape",
    });

    expect(within(target).queryByLabelText("Palabra")).toBeNull();
  });

  // AC-SP6b-6
  it("removes a word from this theme only, after confirming", () => {
    renderEditor();
    const target = row("tema-prueba", "item-uno");

    fireEvent.click(
      within(target).getByRole("button", {
        name: "Quitar «PRUEBA uno» de este tema",
      }),
    );
    expect(document.activeElement).toBe(
      within(target).getByRole("button", { name: "Cancelar" }),
    );
    fireEvent.click(within(target).getByRole("button", { name: "Sí, quitar" }));

    expect(item("tema-prueba", "item-uno")).toBeUndefined();
    expect(item("tema-letras", "item-uno-2")).toBeDefined();
  });

  // AC-SP6b-4
  it("verifies the whole theme after a confirmation that counts the words", () => {
    renderEditor();
    fireEvent.change(screen.getByLabelText("Tema"), {
      target: { value: "tema-letras" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Marcar todas como verificadas" }),
    );
    expect(screen.getByText(/Se marcarán 2 palabras/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Sí, marcar 2" }));

    expect(
      latest.themes
        .find((theme) => theme.id === "tema-letras")
        ?.items.every((candidate) => candidate.verified),
    ).toBe(true);
    expect(
      (
        screen.getByRole("button", {
          name: "Marcar todas como verificadas",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  // AC-SP6b-6
  it("adds a typed word with its source, and refuses a repeated one", () => {
    renderEditor();
    fireEvent.change(screen.getByLabelText("Tema"), {
      target: { value: "tema-letras" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Agregar una palabra a este tema" }),
    );
    const form = screen.getByRole("form", { name: /Nueva palabra/ });

    fireEvent.change(within(form).getByLabelText("Palabra"), {
      target: { value: "PRUEBA sola" },
    });
    fireEvent.change(within(form).getByLabelText("Traducción"), {
      target: { value: "otra" },
    });
    fireEvent.click(within(form).getByRole("button", { name: "Agregar" }));
    expect(within(form).getByText(/Ya hay una palabra/)).toBeTruthy();

    fireEvent.change(within(form).getByLabelText("Palabra"), {
      target: { value: "PRUEBA nueva" },
    });
    fireEvent.click(within(form).getByRole("button", { name: "Agregar" }));

    const letters = latest.themes.find((theme) => theme.id === "tema-letras");
    expect(letters?.items.at(-1)).toMatchObject({
      word: "PRUEBA nueva",
      translation: "otra",
      sourceId: "fuente-prueba",
      verified: false,
    });
    expect(screen.getByRole("status").textContent).toMatch(/agregada/);
  });

  it("warns when the browser could not keep a copy", () => {
    renderEditor(twoThemes(), false);

    fireEvent.click(
      screen.getByRole("checkbox", { name: "Verificada: PRUEBA dos" }),
    );

    expect(screen.getByRole("status").textContent).toMatch(
      /no se pudo guardar una copia/,
    );
  });
});

describe("pack editor · empty pack", () => {
  it("says there is nothing to edit", () => {
    render(<PackEditor pack={testPack({ themes: [] })} onChange={vi.fn()} />);
    expect(screen.getByText(/no tiene temas/)).toBeTruthy();
  });
});
