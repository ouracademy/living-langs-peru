import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requestHeaders = vi.fn(async () => new Headers());
vi.mock("next/headers", () => ({ headers: requestHeaders }));

const { default: AdminHomePage, metadata } = await import("@/app/admin/page");

const credentials = `Basic ${Buffer.from("editora:clave-de-prueba").toString("base64")}`;

function withAuthorization(value: string | null) {
  requestHeaders.mockResolvedValue(
    new Headers(value ? { authorization: value } : {}),
  );
}

beforeEach(() => {
  vi.stubEnv("ADMIN_USER", "editora");
  vi.stubEnv("ADMIN_PASSWORD", "clave-de-prueba");
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("/admin", () => {
  it("is never indexed", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("shows no links without valid credentials", async () => {
    withAuthorization(null);

    render(await AdminHomePage());

    expect(
      screen.getByRole("heading", { name: "Acceso restringido" }),
    ).toBeTruthy();
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("rejects a wrong password", async () => {
    withAuthorization(
      `Basic ${Buffer.from("editora:otra-clave").toString("base64")}`,
    );

    render(await AdminHomePage());

    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("links to the photo editor with valid credentials", async () => {
    withAuthorization(credentials);

    render(await AdminHomePage());

    expect(
      screen.getByRole("heading", { name: "Administración" }),
    ).toBeTruthy();
    const link = screen.getByRole("link", {
      name: /Fotos de la galería asháninka/,
    });
    expect(link.getAttribute("href")).toBe("/admin/fotos");
  });

  // gestor-lenguas F4: /admin/juego was retired; the game's words live in the
  // language bundles.
  it("no longer links to the retired game admin", async () => {
    withAuthorization(credentials);

    render(await AdminHomePage());

    expect(
      screen.queryByRole("link", { name: /Paquetes de Saltapalabras/ }),
    ).toBeNull();
    expect(
      screen
        .getAllByRole("link")
        .some((link) => link.getAttribute("href") === "/admin/juego"),
    ).toBe(false);
  });

  // gestor-lenguas T2.3
  it("links to the language content manager with valid credentials", async () => {
    withAuthorization(credentials);

    render(await AdminHomePage());

    const link = screen.getByRole("link", {
      name: /Contenido de las lenguas/,
    });
    expect(link.getAttribute("href")).toBe("/admin/lenguas");
  });
});
