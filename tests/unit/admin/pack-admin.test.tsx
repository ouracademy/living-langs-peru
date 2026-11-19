import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { draftKey } from "@/lib/language-packs/draft-storage";
import type { PackEntry } from "@/lib/language-packs/publishing";
import type { LanguagePack } from "@/lib/language-packs/types";

import { testItem, testPack, testTheme } from "../language-packs/fixtures";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const { PackAdmin } = await import("@/components/admin/pack-admin/pack-admin");

const BUCKET = "https://proyecto.supabase.co/storage/v1/object/public/audio/";
const CURRENT: PackEntry = {
  version: 2,
  note: "Revisado por PRUEBA",
  publishedAt: "2026-11-18T15:00:00Z",
  pack: testPack(),
};

type FetchCall = { url: string; body: unknown };
let calls: FetchCall[];

function answering(...answers: { status: number; body: unknown }[]) {
  calls = [];
  const queue = [...answers];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({
        url,
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
      });
      const next = queue.shift() ?? { status: 200, body: {} };
      return new Response(JSON.stringify(next.body), { status: next.status });
    }),
  );
}

function renderAdmin(current: PackEntry | null = null) {
  return render(
    <PackAdmin
      language="ashaninka"
      name="Asháninka"
      audioBaseUrl={BUCKET}
      current={current}
      versions={
        current
          ? [
              { version: 2, note: "dos", publishedAt: current.publishedAt },
              { version: 1, note: "uno", publishedAt: "2026-11-17T15:00:00Z" },
            ]
          : []
      }
    />,
  );
}

async function importFile(content: string, name = "paquete.json") {
  const input = screen.getByLabelText("Importar un .json");
  fireEvent.change(input, {
    target: {
      files: [new File([content], name, { type: "application/json" })],
    },
  });
}

const packWithError = (): LanguagePack =>
  testPack({
    themes: [
      testTheme({
        items: [
          testItem({ sourceId: "no-existe" }),
          ...testTheme().items.slice(1),
        ],
      }),
    ],
  });

beforeEach(() => {
  window.localStorage.clear();
  refresh.mockClear();
  answering();
  // jsdom has no object URLs; downloads only need them to exist.
  URL.createObjectURL = vi.fn(() => "blob:prueba");
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("/admin/juego · importing", () => {
  // AC-SP6-4
  it("refuses an invalid file and changes nothing", async () => {
    renderAdmin();

    await importFile("{ roto");

    expect(
      await screen.findByText(/no tiene el formato de un paquete/),
    ).toBeTruthy();
    expect(window.localStorage.getItem(draftKey("ashaninka"))).toBeNull();
    expect(screen.queryByRole("button", { name: "Publicar" })).toBeNull();
  });

  it("refuses a pack of another language", async () => {
    renderAdmin();

    await importFile(
      JSON.stringify(
        testPack({ language: { ...testPack().language, slug: "uro" } }),
      ),
    );

    expect(await screen.findByText(/no de Asháninka/)).toBeTruthy();
  });

  // AC-SP6-13
  it("keeps a valid pack in this browser and shows what it holds", async () => {
    renderAdmin();

    await importFile(JSON.stringify(testPack()));

    expect(await screen.findByText(/cargado/)).toBeTruthy();
    expect(screen.getByText(/4 palabras en 1 temas/)).toBeTruthy();
    expect(screen.getByText("✓ Sin errores ni avisos.")).toBeTruthy();
    expect(window.localStorage.getItem(draftKey("ashaninka"))).not.toBeNull();
  });

  it("picks the saved pack up again after a reload", () => {
    window.localStorage.setItem(
      draftKey("ashaninka"),
      JSON.stringify(testPack()),
    );

    renderAdmin();

    expect(screen.getByRole("button", { name: "Publicar" })).toBeTruthy();
  });

  it("starts from the published pack", () => {
    renderAdmin(CURRENT);

    fireEvent.click(
      screen.getByRole("button", { name: "Partir del publicado" }),
    );

    expect(screen.getByText(/Copiamos el paquete publicado/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Publicar" })).toBeTruthy();
  });
});

describe("/admin/juego · checking and publishing", () => {
  // AC-SP6-6
  it("does not let a pack with errors be published, and links each error to its item", async () => {
    renderAdmin();
    await importFile(JSON.stringify(packWithError()));

    const errors = await screen.findByRole("region", { name: /1 error/ });
    const link = within(errors).getByRole("link");
    expect(link.getAttribute("href")).toMatch(/^#item-/);
    expect(
      document.querySelector(link.getAttribute("href") ?? ""),
    ).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/Nota de publicación/), {
      target: { value: "Revisado por PRUEBA" },
    });
    expect(
      (screen.getByRole("button", { name: "Publicar" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  // AC-SP6-12, AC-SP6-11
  it("publishes with a note and the version it saw, then refreshes", async () => {
    answering({
      status: 200,
      body: { ok: true, version: 3, message: "Publicada la versión 3." },
    });
    renderAdmin(CURRENT);
    fireEvent.click(
      screen.getByRole("button", { name: "Partir del publicado" }),
    );
    const publishButton = screen.getByRole("button", {
      name: "Publicar",
    }) as HTMLButtonElement;
    expect(publishButton.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText(/Nota de publicación/), {
      target: { value: "Revisado por PRUEBA" },
    });
    fireEvent.click(publishButton);

    expect(await screen.findByText("Publicada la versión 3.")).toBeTruthy();
    expect(calls[0].url).toBe("/api/admin/juego/ashaninka/publicar");
    expect(calls[0].body).toMatchObject({
      expectedVersion: 2,
      note: "Revisado por PRUEBA",
    });
    expect(refresh).toHaveBeenCalled();
    expect(window.localStorage.getItem(draftKey("ashaninka"))).toBeNull();
  });

  // AC-SP6-7
  it("on a conflict offers to download the published one or publish anyway", async () => {
    answering(
      {
        status: 409,
        body: {
          error: "version_conflict",
          message: "Alguien publicó otra versión.",
        },
      },
      { status: 200, body: { current: CURRENT } },
      {
        status: 200,
        body: { ok: true, version: 4, message: "Publicada la versión 4." },
      },
    );
    renderAdmin(CURRENT);
    fireEvent.click(
      screen.getByRole("button", { name: "Partir del publicado" }),
    );
    fireEvent.change(screen.getByLabelText(/Nota de publicación/), {
      target: { value: "Revisado por PRUEBA" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Publicar" }));

    const alert = await screen.findByRole("alert");
    fireEvent.click(
      within(alert).getByRole("button", { name: "Descargar la publicada" }),
    );
    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[1].url).toBe("/api/admin/juego/ashaninka");

    fireEvent.click(
      within(alert).getByRole("button", { name: "Publicar igual" }),
    );

    expect(await screen.findByText("Publicada la versión 4.")).toBeTruthy();
    expect(calls[2].body).toMatchObject({ expectedVersion: null });
  });

  it("shows the server's message when publishing fails for another reason", async () => {
    answering({
      status: 502,
      body: { error: "unavailable", message: "Base caída." },
    });
    renderAdmin(CURRENT);
    fireEvent.click(
      screen.getByRole("button", { name: "Partir del publicado" }),
    );
    fireEvent.change(screen.getByLabelText(/Nota de publicación/), {
      target: { value: "Revisado por PRUEBA" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Publicar" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Base caída.");
    expect(within(alert).queryByRole("button")).toBeNull();
  });
});

describe("/admin/juego · trying, exporting, discarding", () => {
  // AC-SP6-10
  it("plays the unverified items in a marked preview", async () => {
    renderAdmin();
    await importFile(
      JSON.stringify(
        testPack({
          themes: [
            testTheme({
              items: testTheme().items.map((item) => ({
                ...item,
                verified: false,
              })),
            }),
          ],
        }),
      ),
    );

    fireEvent.click(await screen.findByRole("button", { name: "Probar" }));

    expect(screen.getByText(/Vista previa: puede tener errores/)).toBeTruthy();
    expect(screen.getByText(/4 palabras, 4 sin verificar/)).toBeTruthy();
  });

  it("says when no theme reaches its minimum to be tried", async () => {
    renderAdmin();
    await importFile(
      JSON.stringify(
        testPack({ themes: [testTheme({ items: [testItem()] })] }),
      ),
    );

    fireEvent.click(await screen.findByRole("button", { name: "Probar" }));

    expect(screen.getByText(/Ningún tema llega al mínimo/)).toBeTruthy();
  });

  it("exports the pack in preparation as a file", async () => {
    renderAdmin();
    await importFile(JSON.stringify(testPack()));

    fireEvent.click(await screen.findByRole("button", { name: "Exportar" }));

    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  // AC-SP6-13
  it("discards the pack only after confirming", async () => {
    renderAdmin();
    await importFile(JSON.stringify(testPack()));

    fireEvent.click(await screen.findByRole("button", { name: "Descartar" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(window.localStorage.getItem(draftKey("ashaninka"))).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Descartar" }));
    fireEvent.click(screen.getByRole("button", { name: "Sí, descartar" }));

    expect(window.localStorage.getItem(draftKey("ashaninka"))).toBeNull();
    expect(screen.getByText("Paquete en preparación descartado.")).toBeTruthy();
  });
});

describe("/admin/juego · history", () => {
  it("lists the versions and marks the published one", () => {
    renderAdmin(CURRENT);

    expect(screen.getByText("Versión 2 (publicada)")).toBeTruthy();
    expect(screen.getByText("Versión 1")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Restaurar la versión 2" }),
    ).toBeNull();
  });

  // AC-SP6-9
  it("restores an old version after confirming, keeping the draft", async () => {
    window.localStorage.setItem(
      draftKey("ashaninka"),
      JSON.stringify(testPack()),
    );
    answering({
      status: 200,
      body: {
        ok: true,
        version: 3,
        message: "La versión 1 quedó publicada como versión 3.",
      },
    });
    renderAdmin(CURRENT);

    fireEvent.click(
      screen.getByRole("button", { name: "Restaurar la versión 1" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Sí, restaurar" }));

    expect(
      await screen.findByText("La versión 1 quedó publicada como versión 3."),
    ).toBeTruthy();
    expect(calls[0]).toEqual({
      url: "/api/admin/juego/ashaninka/restaurar",
      body: { version: 1, expectedVersion: 2 },
    });
    expect(refresh).toHaveBeenCalled();
    expect(window.localStorage.getItem(draftKey("ashaninka"))).not.toBeNull();
  });

  it("downloads a version, and says when it cannot", async () => {
    answering(
      { status: 200, body: { ...CURRENT, version: 1 } },
      { status: 502, body: { error: "unavailable", message: "Base caída." } },
    );
    renderAdmin(CURRENT);

    fireEvent.click(
      screen.getByRole("button", { name: "Descargar la versión 1" }),
    );
    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalled());

    fireEvent.click(
      screen.getByRole("button", { name: "Descargar la versión 1" }),
    );
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Base caída.",
    );
  });

  it("says there is no history yet", () => {
    renderAdmin();

    expect(screen.getByText("Todavía no hay versiones.")).toBeTruthy();
  });
});
