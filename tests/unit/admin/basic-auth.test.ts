import { describe, expect, it } from "vitest";

import {
  adminAuthResponse,
  checkBasicAuth,
  unauthorizedResponse,
} from "@/lib/admin/basic-auth";

const env = { ADMIN_USER: "editora", ADMIN_PASSWORD: "clave-larga-de-prueba" };

const basic = (value: string) =>
  `Basic ${Buffer.from(value, "utf8").toString("base64")}`;

describe("checkBasicAuth", () => {
  // AC-E1-1
  it("accepts the configured user and password", () => {
    expect(checkBasicAuth(basic("editora:clave-larga-de-prueba"), env)).toBe(
      "ok",
    );
  });

  it("accepts a lowercase scheme", () => {
    const header = basic("editora:clave-larga-de-prueba").replace(
      "Basic",
      "basic",
    );
    expect(checkBasicAuth(header, env)).toBe("ok");
  });

  it("keeps colons that belong to the password", () => {
    const withColon = { ...env, ADMIN_PASSWORD: "a:b:c" };
    expect(checkBasicAuth(basic("editora:a:b:c"), withColon)).toBe("ok");
  });

  // AC-E1-1
  it("rejects a wrong password", () => {
    expect(checkBasicAuth(basic("editora:otra"), env)).toBe("unauthorized");
  });

  // AC-E1-1
  it("rejects a wrong user", () => {
    expect(checkBasicAuth(basic("otra:clave-larga-de-prueba"), env)).toBe(
      "unauthorized",
    );
  });

  // AC-E1-1
  it("rejects a missing header", () => {
    expect(checkBasicAuth(null, env)).toBe("unauthorized");
    expect(checkBasicAuth("", env)).toBe("unauthorized");
  });

  it("rejects a header with another scheme", () => {
    expect(checkBasicAuth("Bearer abc", env)).toBe("unauthorized");
  });

  it("rejects invalid base64", () => {
    expect(checkBasicAuth("Basic %%%not-base64%%%", env)).toBe("unauthorized");
  });

  it("rejects credentials without a colon", () => {
    expect(checkBasicAuth(basic("editora"), env)).toBe("unauthorized");
  });

  // AC-E1-2
  it("reports missing configuration before looking at the header", () => {
    expect(checkBasicAuth(basic("editora:x"), {})).toBe("missing_config");
    expect(
      checkBasicAuth(basic(":"), { ADMIN_USER: "", ADMIN_PASSWORD: "" }),
    ).toBe("missing_config");
    expect(
      checkBasicAuth(basic("editora: "), {
        ADMIN_USER: "editora",
        ADMIN_PASSWORD: "   ",
      }),
    ).toBe("missing_config");
  });
});

describe("unauthorizedResponse", () => {
  // AC-E1-1
  it("answers 401 with a Basic challenge", () => {
    const response = unauthorizedResponse();

    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toBe(
      'Basic realm="Edición", charset="UTF-8"',
    );
  });
});

describe("adminAuthResponse", () => {
  it("lets a valid request through", () => {
    expect(
      adminAuthResponse(basic("editora:clave-larga-de-prueba"), env),
    ).toBeNull();
  });

  // AC-E1-1
  it("answers 401 to bad credentials", () => {
    expect(adminAuthResponse(basic("editora:mal"), env)?.status).toBe(401);
  });

  // AC-E1-2
  it("answers 503 when the editing credentials are not configured", async () => {
    const response = adminAuthResponse(basic("editora:x"), {});

    expect(response?.status).toBe(503);
    expect(response?.headers.get("WWW-Authenticate")).toBeNull();
    expect(await response?.text()).toContain("Edición no configurada");
  });
});
