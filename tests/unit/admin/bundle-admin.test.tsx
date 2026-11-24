import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  BundleAdmin,
  type PublishedBundle,
} from "@/components/admin/bundle-admin/bundle-admin";
import { discardBundleDraft } from "@/components/admin/bundle-admin/draft-store";
import type { LanguageBundle } from "@/lib/language-bundles/types";

import { testBundle, testEntry } from "../language-bundles/fixtures";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/admin/lenguas/uro",
  useSearchParams: () => new URLSearchParams(),
}));

const PUBLISHED: PublishedBundle = {
  version: 2,
  note: "Revisado por PRUEBA",
  publishedAt: "2026-11-22T10:00:00+00:00",
  bundle: testBundle(),
};

function renderAdmin(current: PublishedBundle | null = PUBLISHED) {
  return render(
    <BundleAdmin
      language="uro"
      name="Uro"
      isoCode=""
      current={current}
      versions={current ? [current] : []}
    />,
  );
}

function upload(content: string | LanguageBundle, name = "uro.json") {
  const text = typeof content === "string" ? content : JSON.stringify(content);
  const input = screen.getByLabelText("Subir JSON");
  fireEvent.change(input, {
    target: { files: [new File([text], name, { type: "application/json" })] },
  });
}

beforeEach(() => {
  localStorage.clear();
  discardBundleDraft("uro");
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("BundleAdmin upload", () => {
  it("loads a file straight away when nothing is there yet", async () => {
    renderAdmin(null);

    upload(testBundle());

    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toMatch(
        /Archivo «uro.json» cargado/,
      ),
    );
    expect(screen.getByText(/Copia de trabajo: 3 palabras/)).toBeTruthy();
  });

  // AC-L4-2
  it("shows the differences and changes nothing until the editor confirms", async () => {
    renderAdmin();
    const next = testBundle({
      entries: [
        testEntry({ translations: ["PRUEBA uno corregida"] }),
        testEntry({ id: "prueba-cuatro", word: "mano" }),
      ],
      themes: [],
    });

    upload(next, "nuevo.json");

    const summary = await screen.findByRole("heading", {
      name: /¿Reemplazar el contenido con «nuevo.json»\?/,
    });
    const panel = summary.closest("section")!;
    expect(panel.textContent).toMatch(/1 palabra nueva/);
    expect(panel.textContent).toMatch(/1 palabra cambiada/);
    expect(panel.textContent).toMatch(/2 palabras que faltan/);
    expect(panel.textContent).toMatch(/También cambian/);
    expect(screen.queryByText(/Copia de trabajo: /)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.getByRole("status").textContent).toMatch(/sigue igual/);
    expect(screen.queryByText(/Copia de trabajo: /)).toBeNull();

    upload(next, "nuevo.json");
    await screen.findByRole("heading", { name: /¿Reemplazar/ });
    fireEvent.click(
      screen.getByRole("button", { name: "Reemplazar la copia de trabajo" }),
    );
    expect(screen.getByText(/Copia de trabajo: 2 palabras/)).toBeTruthy();
  });

  it("refuses a file that is not a bundle, and one of the other language", async () => {
    renderAdmin(null);

    upload("{ roto");
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toMatch(
        /no tiene el formato de un paquete de lengua/,
      ),
    );

    upload(testBundle({ language: "ashaninka" }));
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toMatch(
        /es de «ashaninka», no de Uro/,
      ),
    );
    expect(screen.queryByText(/Copia de trabajo: /)).toBeNull();
  });

  it("works on the published content, shows issues and tries it", async () => {
    renderAdmin();

    fireEvent.click(
      screen.getByRole("button", { name: "Trabajar sobre lo publicado" }),
    );
    expect(screen.getByText(/Copia de trabajo: 3 palabras/)).toBeTruthy();
    expect(screen.getByText(/Sin errores ni avisos|aviso/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Probar" }));
    expect(
      screen.getByRole("heading", { name: "Prueba: diccionario" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Prueba: Saltapalabras" }),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Descartar" }));
    fireEvent.click(screen.getByRole("button", { name: "Sí, descartar" }));
    expect(screen.getByRole("status").textContent).toMatch(/descartada/);
  });

  it("blocks publishing while the working copy has errors", async () => {
    renderAdmin(null);

    upload(testBundle({ entries: [testEntry({ sourceId: "no-existe" })] }));

    await screen.findByText(/hay que corregirlos/);
    fireEvent.change(screen.getByLabelText(/Nota de publicación/), {
      target: { value: "Revisado por PRUEBA" },
    });
    expect(
      (screen.getByRole("button", { name: "Publicar" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});
