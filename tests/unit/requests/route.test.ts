import { beforeEach, describe, expect, it, vi } from "vitest";

const insert = vi.fn();
const from = vi.fn(() => ({ insert }));
const getSupabaseAdmin = vi.fn(() => ({ from }));

vi.mock("@/lib/supabase-admin", () => ({ getSupabaseAdmin }));

const { POST } = await import("@/app/api/solicitudes/route");

const valid = {
  nombre: "  Rosa Quispe ",
  telefono: "+51  987 654 321",
  email: "rosa@example.com",
  rol: "editor",
  motivo: "  Hablo asháninka y quiero ayudar a validar traducciones. ",
  consentimiento: true,
  website: "",
};

const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/solicitudes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

const SUCCESS_BODY = {
  ok: true,
  message: "¡Gracias! Recibimos tu solicitud y te contactaremos pronto.",
};

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  insert.mockReset().mockResolvedValue({ error: null });
  from.mockClear();
  getSupabaseAdmin.mockReset().mockReturnValue({ from });
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/solicitudes", () => {
  // AC-S2-1
  it("saves one trimmed row and answers 200", async () => {
    const response = await post(valid);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(SUCCESS_BODY);
    expect(from).toHaveBeenCalledWith("solicitudes");
    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledWith({
      nombre: "Rosa Quispe",
      telefono: "+51 987 654 321",
      email: "rosa@example.com",
      rol: "editor",
      motivo: "Hablo asháninka y quiero ayudar a validar traducciones.",
      consentimiento: true,
    });
  });

  // AC-S2-2
  it.each([
    ["omitted", undefined],
    ["an empty string", ""],
  ])("saves email as null when it is %s", async (_label, email) => {
    await post({ ...valid, email });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ email: null }),
    );
  });

  // AC-S2-3
  describe("honeypot", () => {
    it("answers the same success body and touches nothing", async () => {
      const real = await (await post(valid)).json();
      insert.mockClear();
      getSupabaseAdmin.mockClear();

      const trapped = await post({ ...valid, website: "http://spam.example" });

      expect(trapped.status).toBe(200);
      expect(await trapped.json()).toEqual(real);
      expect(getSupabaseAdmin).not.toHaveBeenCalled();
      expect(insert).not.toHaveBeenCalled();
    });

    it("is caught before validation, even with an invalid body", async () => {
      const response = await post({ website: "x" });

      expect(response.status).toBe(200);
      expect(insert).not.toHaveBeenCalled();
    });

    it("ignores a blank website", async () => {
      const response = await post({ ...valid, website: "   " });

      expect(response.status).toBe(200);
      expect(insert).toHaveBeenCalledTimes(1);
    });

    it("treats a non-string value as content", async () => {
      await post({ ...valid, website: 1 });

      expect(insert).not.toHaveBeenCalled();
    });
  });

  // AC-S2-4
  describe("validation", () => {
    it("answers 400 with a Spanish message under each failing field", async () => {
      const response = await post({
        ...valid,
        telefono: "123",
        consentimiento: false,
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "validation_error",
        message: "Revisa los campos marcados.",
        fields: {
          telefono: "Ingresa un teléfono de 7 a 15 dígitos.",
          consentimiento: "Debes aceptar para poder enviar.",
        },
      });
      expect(insert).not.toHaveBeenCalled();
    });

    it.each([
      ["nombre", { nombre: "" }],
      ["telefono", { telefono: "12345" }],
      ["email", { email: "nope" }],
      ["rol", { rol: "voluntario" }],
      ["motivo", { motivo: "corto" }],
      ["consentimiento", { consentimiento: false }],
    ])("rejects a bad %s", async (field, override) => {
      const response = await post({ ...valid, ...override });

      expect(response.status).toBe(400);
      expect(Object.keys((await response.json()).fields)).toEqual([field]);
      expect(insert).not.toHaveBeenCalled();
    });

    it("answers 400 when the body is valid JSON but not an object", async () => {
      const response = await post([1, 2]);

      expect(response.status).toBe(400);
      expect((await response.json()).error).toBe("validation_error");
    });
  });

  // AC-S2-5
  it("answers 400 invalid_json when the body is not JSON", async () => {
    const response = await post("{not json");

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "invalid_json",
      message: "No pudimos leer tu solicitud. Intenta de nuevo.",
    });
    expect(insert).not.toHaveBeenCalled();
  });

  // AC-S2-8
  describe("when saving fails", () => {
    const genericBody = {
      error: "server_error",
      message: "No pudimos guardar tu solicitud. Intenta de nuevo más tarde.",
    };

    it("answers a generic 500 and leaks nothing from Supabase", async () => {
      insert.mockResolvedValue({
        error: {
          code: "23514",
          message: "new row violates check constraint",
          details: "Failing row contains (Rosa Quispe, +51 987 654 321)",
        },
      });

      const response = await post(valid);
      const text = await response.text();

      expect(response.status).toBe(500);
      expect(JSON.parse(text)).toEqual(genericBody);
      expect(text).not.toContain("23514");
      expect(text).not.toContain("check constraint");
      expect(text).not.toContain("Rosa");
    });

    it("logs only the error code, never the row", async () => {
      insert.mockResolvedValue({
        error: {
          code: "23514",
          message: "x",
          details: "Failing row contains (Rosa Quispe, +51 987 654 321)",
        },
      });

      await post(valid);

      const logged = JSON.stringify(consoleError.mock.calls);
      expect(logged).toContain("23514");
      expect(logged).not.toContain("Rosa");
      expect(logged).not.toContain("987");
    });

    it("answers a generic 500 when the client cannot be built", async () => {
      getSupabaseAdmin.mockImplementation(() => {
        throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      });

      const response = await post(valid);

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual(genericBody);
      expect(JSON.stringify(consoleError.mock.calls)).toContain(
        "Missing SUPABASE_URL",
      );
    });

    it("answers a generic 500 when the insert throws", async () => {
      insert.mockRejectedValue(new TypeError("fetch failed"));

      const response = await post(valid);

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual(genericBody);
    });
  });

  // AC-S2-9
  it("never returns the saved data, an id or a timestamp", async () => {
    const text = await (await post(valid)).text();

    expect(JSON.parse(text)).toEqual(SUCCESS_BODY);
    expect(Object.keys(JSON.parse(text))).toEqual(["ok", "message"]);
    for (const leaked of ["Rosa", "987", "rosa@", "created_at"]) {
      expect(text).not.toContain(leaked);
    }
  });
});
