import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  BundleAdmin,
  type PublishedBundle,
} from "@/components/admin/bundle-admin/bundle-admin";
import {
  discardBundleDraft,
  getBundleDraft,
} from "@/components/admin/bundle-admin/draft-store";
import { parseBundle } from "@/lib/language-bundles/schema";
import type { LanguageBundle } from "@/lib/language-bundles/types";

import { testBundle, testEntry } from "../language-bundles/fixtures";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/admin/lenguas/uro",
  useSearchParams: () => new URLSearchParams(),
}));

function published(bundle: LanguageBundle = testBundle()): PublishedBundle {
  return {
    version: 1,
    note: "PRUEBA",
    publishedAt: "2026-11-22T10:00:00+00:00",
    bundle,
  };
}

/** The admin with the published bundle copied into the working copy. */
function openEditor(bundle?: LanguageBundle) {
  const current = published(bundle);
  render(
    <BundleAdmin
      language="uro"
      name="Uro"
      isoCode=""
      current={current}
      versions={[current]}
    />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Trabajar sobre lo publicado" }),
  );
}

function draft(): LanguageBundle {
  const bundle = getBundleDraft("uro");
  if (!bundle) throw new Error("no working copy");
  // Whatever the editor does, the working copy still reads back.
  expect(parseBundle(bundle).ok).toBe(true);
  return bundle;
}

const status = () => screen.getByRole("status").textContent ?? "";

function openTab(name: string) {
  fireEvent.click(screen.getByRole("tab", { name }));
}

beforeEach(() => {
  localStorage.clear();
  discardBundleDraft("uro");
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("the editor tabs", () => {
  // AC-L4-6
  it("moves between tabs with the arrow keys, Home and End", () => {
    openEditor();
    const words = screen.getByRole("tab", { name: "Palabras" });
    expect(words.getAttribute("aria-selected")).toBe("true");

    fireEvent.keyDown(words, { key: "ArrowRight" });
    const games = screen.getByRole("tab", { name: "Juegos" });
    expect(games.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(games);

    fireEvent.keyDown(games, { key: "End" });
    expect(
      screen
        .getByRole("tab", { name: "Fuentes" })
        .getAttribute("aria-selected"),
    ).toBe("true");
    fireEvent.keyDown(screen.getByRole("tab", { name: "Fuentes" }), {
      key: "ArrowRight",
    });
    expect(
      screen
        .getByRole("tab", { name: "Palabras" })
        .getAttribute("aria-selected"),
    ).toBe("true");
  });

  it("starts the uro from the template when nothing is published", () => {
    render(
      <BundleAdmin
        language="uro"
        name="Uro"
        isoCode=""
        current={null}
        versions={[]}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Empezar desde la plantilla" }),
    );
    expect(draft().language).toBe("uro");
    expect(status()).toMatch(/plantilla/);
  });
});

describe("Palabras", () => {
  // AC-L4-3
  it("edits a word in place and keeps its id", () => {
    openEditor();
    const row = document.getElementById("palabra-prueba-uno") as HTMLElement;
    fireEvent.click(within(row).getByRole("button", { name: /Editar/ }));
    fireEvent.change(within(row).getByLabelText("Traducciones"), {
      target: { value: "PRUEBA corregida" },
    });
    fireEvent.click(within(row).getByRole("button", { name: "Guardar" }));

    const entry = draft().entries.find((each) => each.id === "prueba-uno");
    expect(entry?.translations).toEqual(["PRUEBA corregida"]);
    expect(draft().themes[0].entryIds).toContain("prueba-uno");
    expect(status()).toMatch(/guardada/);
  });

  it("checks the form and focuses the first field with an error", () => {
    openEditor();
    fireEvent.click(
      screen.getByRole("button", { name: "Agregar una palabra" }),
    );
    const form = screen.getByRole("region", { name: "Palabra nueva" });
    fireEvent.click(within(form).getByRole("button", { name: "Agregar" }));

    const word = within(form).getByLabelText("Palabra");
    expect(word.getAttribute("aria-invalid")).toBe("true");
    expect(document.activeElement).toBe(word);
    expect(within(form).getByText("Escribe la palabra.")).toBeTruthy();
  });

  it("adds a word with a new id", () => {
    openEditor();
    fireEvent.click(
      screen.getByRole("button", { name: "Agregar una palabra" }),
    );
    const form = screen.getByRole("region", { name: "Palabra nueva" });
    fireEvent.change(within(form).getByLabelText("Palabra"), {
      target: { value: "sapo" },
    });
    fireEvent.change(within(form).getByLabelText("Traducciones"), {
      target: { value: "PRUEBA nueva" },
    });
    fireEvent.click(within(form).getByRole("button", { name: "Agregar" }));

    expect(draft().entries.at(-1)).toMatchObject({
      id: "sapo",
      word: "sapo",
      verified: false,
    });
  });

  it("removes a word from the list and from its themes, after asking", () => {
    openEditor();
    const row = document.getElementById("palabra-prueba-dos") as HTMLElement;
    fireEvent.click(within(row).getByRole("button", { name: /Quitar/ }));
    expect(
      within(row).getByText(/También sale de: «Tema de PRUEBA»/),
    ).toBeTruthy();
    fireEvent.click(within(row).getByRole("button", { name: "Sí, quitar" }));

    expect(draft().entries.map((entry) => entry.id)).not.toContain(
      "prueba-dos",
    );
    expect(draft().themes[0].entryIds).not.toContain("prueba-dos");
  });

  it("verifies the listed unverified words, saying who checked them", () => {
    openEditor(
      testBundle({
        entries: [
          testEntry({ verified: false }),
          testEntry({ id: "otra", word: "mesa", verified: false }),
        ],
        themes: [],
      }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Marcar las 2 sin verificar de esta lista como verificadas",
      }),
    );
    const confirm = screen.getByRole("button", {
      name: "Sí, marcar 2 como verificadas",
    });
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Quién o qué las verificó"), {
      target: { value: "Hablante de PRUEBA" },
    });
    fireEvent.click(confirm);

    expect(draft().entries.every((entry) => entry.verified)).toBe(true);
    expect(draft().entries[0].verifiedBy).toBe("Hablante de PRUEBA");
  });

  it("filters by search and by «sin verificar»", () => {
    openEditor(
      testBundle({
        entries: [
          testEntry(),
          testEntry({ id: "otra", word: "mesa", verified: false }),
        ],
        themes: [],
      }),
    );
    fireEvent.click(screen.getByLabelText("Solo sin verificar"));
    expect(screen.getByText("1 de 2 palabras")).toBeTruthy();
    expect(document.getElementById("palabra-otra")).toBeTruthy();
    expect(document.getElementById("palabra-prueba-uno")).toBeNull();
  });

  it("takes a warning to the word's row", () => {
    openEditor(
      testBundle({
        entries: [
          testEntry(),
          testEntry({ id: "otra", word: "mesa", verified: false }),
        ],
        themes: [],
      }),
    );
    openTab("Fuentes");
    fireEvent.click(
      screen.getByRole("button", { name: /«mesa» no está verificada/ }),
    );
    expect(
      screen
        .getByRole("tab", { name: "Palabras" })
        .getAttribute("aria-selected"),
    ).toBe("true");
    expect(document.activeElement?.id).toBe("palabra-otra");
  });
});

describe("Juegos", () => {
  it("adds a word to a theme and refuses to empty it", () => {
    openEditor(
      testBundle({
        themes: [
          {
            id: "solo",
            name: "Solo",
            icon: "🧪",
            mode: "first",
            entryIds: ["prueba-uno"],
          },
        ],
      }),
    );
    openTab("Juegos");
    const card = document.getElementById("tema-solo") as HTMLElement;
    fireEvent.click(within(card).getByRole("checkbox", { name: /mesa/ }));
    expect(draft().themes[0].entryIds).toEqual(["prueba-uno", "prueba-dos"]);

    fireEvent.click(within(card).getByRole("checkbox", { name: /pato/ }));
    fireEvent.click(within(card).getByRole("checkbox", { name: /mesa/ }));
    expect(draft().themes[0].entryIds).toEqual(["prueba-dos"]);
    expect(status()).toMatch(/necesita al menos una palabra/);
  });

  it("adds a theme with its words", () => {
    openEditor();
    openTab("Juegos");
    fireEvent.click(screen.getByRole("button", { name: "Agregar un tema" }));
    const form = screen.getByRole("form", { name: "Tema nuevo" });
    fireEvent.change(within(form).getByLabelText("Nombre del tema"), {
      target: { value: "Animales de PRUEBA" },
    });
    fireEvent.change(within(form).getByLabelText("Icono (emoji)"), {
      target: { value: "🐾" },
    });
    fireEvent.click(within(form).getByRole("checkbox", { name: /pato/ }));
    fireEvent.click(
      within(form).getByRole("button", { name: "Agregar el tema" }),
    );

    expect(draft().themes.at(-1)).toMatchObject({
      id: "animales-de-prueba",
      entryIds: ["prueba-uno"],
    });
  });
});

describe("Alfabeto", () => {
  // AC-L4-4, AC-L4-6
  it("reorders letters with the keyboard, the focus follows and the preview updates", () => {
    openEditor();
    openTab("Alfabeto");
    const preview = () =>
      within(screen.getByRole("region", { name: "Así ordena el diccionario" }))
        .getAllByRole("term")
        .map((term) => term.textContent);
    expect(preview()).toEqual(["P", "M"]);

    // Move «m» up past «p»: «m» is the 9th letter, «p» the 5th.
    for (let step = 0; step < 4; step += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Subir «m»" }));
    }
    expect(draft().alphabet.graphemes.indexOf("m")).toBe(4);
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Subir «m»" }),
    );
    expect(preview()).toEqual(["M", "P"]);
  });

  it("adds a letter and keeps the last vowel", () => {
    openEditor(
      testBundle({
        alphabet: { graphemes: ["a", "p"], vowels: ["a"] },
        entries: [],
        themes: [],
      }),
    );
    openTab("Alfabeto");
    fireEvent.change(screen.getByLabelText("Letra nueva"), {
      target: { value: "ch" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Agregar la letra" }));
    expect(draft().alphabet.graphemes).toEqual(["a", "p", "ch"]);

    fireEvent.click(screen.getByRole("button", { name: "Quitar «a»" }));
    expect(status()).toMatch(/única vocal/);
    expect(draft().alphabet.graphemes).toContain("a");
  });

  it("saves variants and confusables, and explains a line it cannot read", () => {
    openEditor();
    openTab("Alfabeto");
    fireEvent.change(screen.getByLabelText("Letras que se confunden"), {
      target: { value: "ch" },
    });
    fireEvent.click(
      screen.getByRole("button", {
        name: "Guardar variantes y letras parecidas",
      }),
    );
    expect(screen.getByText(/«ch» no se entiende/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Letras que se confunden"), {
      target: { value: "ch: s" },
    });
    fireEvent.change(screen.getByLabelText("Variantes de vocales"), {
      target: { value: "á=a" },
    });
    fireEvent.click(
      screen.getByRole("button", {
        name: "Guardar variantes y letras parecidas",
      }),
    );
    expect(draft().alphabet.confusable).toEqual({ ch: ["s"] });
    expect(draft().alphabet.vowelVariants).toEqual({ á: "a" });
  });
});

describe("Fuentes", () => {
  // AC-L4-5
  it("does not remove a source that words cite, and says who cites it", () => {
    openEditor();
    openTab("Fuentes");
    fireEvent.click(
      screen.getByRole("button", { name: /Quitar «Fuente de PRUEBA»/ }),
    );
    expect(status()).toMatch(/la citan 3 palabras, el alfabeto/);
    expect(draft().sources).toHaveLength(1);
  });

  it("adds and edits a source", () => {
    openEditor();
    openTab("Fuentes");
    fireEvent.click(screen.getByRole("button", { name: "Agregar una fuente" }));
    const form = screen.getByRole("region", { name: "Fuente nueva" });
    fireEvent.change(within(form).getByLabelText("Título"), {
      target: { value: "Otra fuente de PRUEBA" },
    });
    fireEvent.change(within(form).getByLabelText("Año"), {
      target: { value: "mil" },
    });
    fireEvent.click(within(form).getByRole("button", { name: "Agregar" }));
    expect(within(form).getByText("El año es un número entero.")).toBeTruthy();

    fireEvent.change(within(form).getByLabelText("Año"), {
      target: { value: "1934" },
    });
    fireEvent.click(within(form).getByRole("button", { name: "Agregar" }));
    expect(draft().sources.at(-1)).toMatchObject({
      id: "otra-fuente-de-prueba",
      year: 1934,
    });

    fireEvent.click(
      screen.getByRole("button", { name: /Editar «Otra fuente de PRUEBA»/ }),
    );
    fireEvent.change(screen.getAllByLabelText("Licencia o permiso").at(-1)!, {
      target: { value: "Dominio público" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(draft().sources.at(-1)?.license).toBe("Dominio público");
  });
});
