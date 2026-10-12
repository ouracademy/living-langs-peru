import { describe, expect, it, vi } from "vitest";

import {
  buildPayload,
  clampReason,
  emptyValues,
  firstInvalidField,
  submitRequest,
  SUBMIT_MESSAGES,
  validateForm,
} from "@/lib/requests/form";
import type { FormValues } from "@/lib/requests/form";
import { countCharacters, messages } from "@/lib/requests/schema";

const filled: FormValues = {
  nombre: "  Rosa Quispe ",
  telefono: " +51 987 654 321 ",
  email: "",
  rol: "editor",
  motivo: "  Hablo asháninka y quiero ayudar a validar traducciones. ",
  consentimiento: true,
  website: "",
};

const reply = (status: number, body: unknown) =>
  vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));

describe("emptyValues", () => {
  it("starts on the role of the card that opened the form", () => {
    expect(emptyValues("donador").rol).toBe("donador");
    expect(emptyValues("editor").rol).toBe("editor");
  });

  it("starts with everything empty and no consent", () => {
    expect(emptyValues("editor")).toEqual({
      nombre: "",
      telefono: "",
      email: "",
      rol: "editor",
      motivo: "",
      consentimiento: false,
      website: "",
    });
  });
});

describe("validateForm", () => {
  // AC-S3-3
  it("reports a message for every empty required field", () => {
    expect(validateForm(emptyValues("editor"))).toEqual({
      nombre: messages.name,
      telefono: messages.phone,
      motivo: messages.reasonTooShort,
      consentimiento: messages.consent,
    });
  });

  it("accepts a filled form, with or without email", () => {
    expect(validateForm(filled)).toEqual({});
    expect(validateForm({ ...filled, email: "rosa@example.com" })).toEqual({});
  });

  it("flags a malformed email but not an empty one", () => {
    expect(validateForm({ ...filled, email: "nope" })).toEqual({
      email: messages.email,
    });
  });

  it("ignores the honeypot field", () => {
    expect(validateForm({ ...filled, website: "anything" })).toEqual({});
  });
});

describe("firstInvalidField", () => {
  it("follows the order of the form, not the order of the errors", () => {
    expect(
      firstInvalidField({
        consentimiento: messages.consent,
        telefono: messages.phone,
      }),
    ).toBe("telefono");
  });

  it("is undefined when there are no errors", () => {
    expect(firstInvalidField({})).toBeUndefined();
  });
});

// AC-S3-4
describe("clampReason", () => {
  it("leaves a text within the limit alone", () => {
    expect(clampReason("a".repeat(1000))).toBe("a".repeat(1000));
  });

  it("cuts a longer text to 1000 characters", () => {
    expect(clampReason("a".repeat(1500))).toBe("a".repeat(1000));
  });

  it("counts emojis as one character each, never splitting one", () => {
    const clamped = clampReason("😀".repeat(1200));

    expect(countCharacters(clamped)).toBe(1000);
    expect(clamped).toBe("😀".repeat(1000));
  });
});

// AC-S3-10
describe("buildPayload", () => {
  it("sends the keys of the API contract with trimmed text", () => {
    expect(buildPayload(filled)).toEqual({
      nombre: "Rosa Quispe",
      telefono: "+51 987 654 321",
      email: "",
      rol: "editor",
      motivo: "Hablo asháninka y quiero ayudar a validar traducciones.",
      consentimiento: true,
      website: "",
    });
  });

  // AC-S3-8
  it("carries the honeypot value as `website`", () => {
    expect(buildPayload({ ...filled, website: "bot" }).website).toBe("bot");
  });
});

describe("submitRequest", () => {
  it("posts the payload as JSON to /api/solicitudes", async () => {
    const fetchImpl = reply(200, { ok: true, message: "Listo" });

    await submitRequest(filled, fetchImpl);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("/api/solicitudes");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(init.body)).toEqual(buildPayload(filled));
  });

  // AC-S3-6
  it("returns the server's message on success", async () => {
    const outcome = await submitRequest(
      filled,
      reply(200, { ok: true, message: "¡Gracias!" }),
    );

    expect(outcome).toEqual({ kind: "success", message: "¡Gracias!" });
  });

  it("falls back to its own thanks when the success body is unreadable", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response("not json", { status: 200 }));

    expect(await submitRequest(filled, fetchImpl)).toEqual({
      kind: "success",
      message: SUBMIT_MESSAGES.success,
    });
  });

  // AC-S3-7
  it("maps a 400 to the server's field messages", async () => {
    const outcome = await submitRequest(
      filled,
      reply(400, {
        error: "validation_error",
        message: "Revisa los campos marcados.",
        fields: { telefono: "Ingresa un teléfono de 7 a 15 dígitos.", x: "?" },
      }),
    );

    expect(outcome).toEqual({
      kind: "invalid",
      message: "Revisa los campos marcados.",
      fields: { telefono: "Ingresa un teléfono de 7 a 15 dígitos." },
    });
  });

  it("treats a 400 with no usable fields as a plain failure", async () => {
    const outcome = await submitRequest(
      filled,
      reply(400, { error: "invalid_json", message: "No pudimos leerla." }),
    );

    expect(outcome).toEqual({ kind: "failed", message: "No pudimos leerla." });
  });

  it("shows the server's message on a 500", async () => {
    const outcome = await submitRequest(
      filled,
      reply(500, { error: "server_error", message: "Intenta más tarde." }),
    );

    expect(outcome).toEqual({
      kind: "failed",
      message: "Intenta más tarde.",
    });
  });

  it("uses a generic message when an error body has none", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response("<html>", { status: 502 }));

    expect(await submitRequest(filled, fetchImpl)).toEqual({
      kind: "failed",
      message: SUBMIT_MESSAGES.generic,
    });
  });

  it("reports a network failure in Spanish", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("Failed"));

    expect(await submitRequest(filled, fetchImpl)).toEqual({
      kind: "failed",
      message: SUBMIT_MESSAGES.network,
    });
  });
});
