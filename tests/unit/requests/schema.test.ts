import { describe, expect, it } from "vitest";

import {
  collectFieldErrors,
  countCharacters,
  messages,
  requestSchema,
} from "@/lib/requests/schema";

const valid = {
  nombre: "Rosa Quispe",
  telefono: "+51 987 654 321",
  email: "rosa@example.com",
  rol: "editor",
  motivo: "Hablo asháninka y quiero ayudar a validar traducciones.",
  consentimiento: true,
};

const errorsFor = (override: Record<string, unknown>) => {
  const result = requestSchema.safeParse({ ...valid, ...override });
  return result.success ? null : collectFieldErrors(result.error);
};

describe("requestSchema", () => {
  it("accepts a complete valid request", () => {
    expect(requestSchema.safeParse(valid).success).toBe(true);
  });

  describe("nombre", () => {
    it("trims the value", () => {
      const result = requestSchema.parse({ ...valid, nombre: "  Rosa  " });
      expect(result.nombre).toBe("Rosa");
    });

    it.each([
      ["empty", ""],
      ["blank", "   "],
      ["missing", undefined],
    ])("rejects a %s name", (_label, nombre) => {
      expect(errorsFor({ nombre })).toEqual({ nombre: messages.name });
    });

    it("rejects more than 100 characters", () => {
      expect(errorsFor({ nombre: "a".repeat(101) })).toEqual({
        nombre: messages.nameTooLong,
      });
      expect(errorsFor({ nombre: "a".repeat(100) })).toBeNull();
    });
  });

  // AC-S2-6
  describe("telefono", () => {
    it.each(["+51 987 654 321", "987654321", "  987 654 321  ", "1234567"])(
      "accepts %j",
      (telefono) => {
        expect(errorsFor({ telefono })).toBeNull();
      },
    );

    it("accepts the 7 and 15 digit limits", () => {
      expect(errorsFor({ telefono: "1".repeat(7) })).toBeNull();
      expect(errorsFor({ telefono: "1".repeat(15) })).toBeNull();
    });

    it.each([
      ["6 digits", "123456"],
      ["16 digits", "1".repeat(16)],
      ["letters", "98765abc"],
      ["a plus in the middle", "51+987654321"],
      ["two pluses", "++51987654321"],
      ["a dash", "987-654-321"],
      ["only a plus", "+"],
      ["empty", ""],
      ["missing", undefined],
    ])("rejects %s", (_label, telefono) => {
      expect(errorsFor({ telefono })).toEqual({ telefono: messages.phone });
    });

    it("does not count the plus or the spaces as digits", () => {
      expect(errorsFor({ telefono: "+12 34 56" })).toEqual({
        telefono: messages.phone,
      });
    });

    it("collapses repeated spaces and trims", () => {
      const result = requestSchema.parse({
        ...valid,
        telefono: "  +51   987  654 321 ",
      });
      expect(result.telefono).toBe("+51 987 654 321");
    });
  });

  describe("email", () => {
    it("is optional", () => {
      const withoutEmail: Record<string, unknown> = { ...valid };
      delete withoutEmail.email;
      const result = requestSchema.parse(withoutEmail);
      expect(result.email).toBeUndefined();
    });

    it("treats an empty string and blanks as no email", () => {
      expect(
        requestSchema.parse({ ...valid, email: "" }).email,
      ).toBeUndefined();
      expect(
        requestSchema.parse({ ...valid, email: "   " }).email,
      ).toBeUndefined();
    });

    it("trims a valid email", () => {
      const result = requestSchema.parse({ ...valid, email: " a@b.co " });
      expect(result.email).toBe("a@b.co");
    });

    it.each(["not-an-email", "a@", "@b.co", "a b@c.co"])(
      "rejects %j",
      (email) => {
        expect(errorsFor({ email })).toEqual({ email: messages.email });
      },
    );

    it("rejects more than 254 characters", () => {
      const email = `${"a".repeat(250)}@b.co`;
      expect(errorsFor({ email })).toEqual({ email: messages.email });
    });
  });

  describe("rol", () => {
    it.each(["donador", "editor"])("accepts %s", (rol) => {
      expect(errorsFor({ rol })).toBeNull();
    });

    it.each([["voluntario"], [""], [undefined], [1]])("rejects %j", (rol) => {
      expect(errorsFor({ rol })).toEqual({ rol: messages.role });
    });
  });

  // AC-S2-7
  describe("motivo", () => {
    it("accepts 10 and 1000 characters", () => {
      expect(errorsFor({ motivo: "a".repeat(10) })).toBeNull();
      expect(errorsFor({ motivo: "a".repeat(1000) })).toBeNull();
    });

    it("rejects 9 characters", () => {
      expect(errorsFor({ motivo: "a".repeat(9) })).toEqual({
        motivo: messages.reasonTooShort,
      });
    });

    it("rejects 1001 characters", () => {
      expect(errorsFor({ motivo: "a".repeat(1001) })).toEqual({
        motivo: messages.reasonTooLong,
      });
    });

    it("measures the trimmed value, which is what the database checks", () => {
      expect(errorsFor({ motivo: `   ${"a".repeat(9)}   ` })).toEqual({
        motivo: messages.reasonTooShort,
      });
      expect(
        requestSchema.parse({ ...valid, motivo: `  ${"a".repeat(10)}  ` })
          .motivo,
      ).toBe("a".repeat(10));
    });

    it("counts Unicode characters like Postgres char_length", () => {
      // 5 emojis are 10 UTF-16 units but 5 characters.
      expect("😀😀😀😀😀".length).toBe(10);
      expect(countCharacters("😀😀😀😀😀")).toBe(5);
      expect(errorsFor({ motivo: "😀😀😀😀😀" })).toEqual({
        motivo: messages.reasonTooShort,
      });
      expect(errorsFor({ motivo: "😀".repeat(10) })).toBeNull();
      // 1000 emojis are 2000 UTF-16 units, yet a valid 1000 character motivo.
      expect(errorsFor({ motivo: "😀".repeat(1000) })).toBeNull();
      expect(errorsFor({ motivo: "😀".repeat(1001) })).toEqual({
        motivo: messages.reasonTooLong,
      });
    });

    it("rejects a missing motivo", () => {
      expect(errorsFor({ motivo: undefined })).toEqual({
        motivo: messages.reasonTooShort,
      });
    });
  });

  describe("consentimiento", () => {
    it.each([[false], [undefined], ["true"], [1], [null]])(
      "rejects %j",
      (consentimiento) => {
        expect(errorsFor({ consentimiento })).toEqual({
          consentimiento: messages.consent,
        });
      },
    );
  });

  // AC-S2-4
  it("reports every failing field at once, one message each", () => {
    const result = requestSchema.safeParse({});
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(collectFieldErrors(result.error)).toEqual({
      nombre: messages.name,
      telefono: messages.phone,
      rol: messages.role,
      motivo: messages.reasonTooShort,
      consentimiento: messages.consent,
    });
  });

  it("returns no field errors when the body is not an object", () => {
    const result = requestSchema.safeParse("nope");
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(collectFieldErrors(result.error)).toEqual({});
  });

  it("drops fields that are not part of the contract", () => {
    const result = requestSchema.parse({ ...valid, id: "x", extra: true });
    expect(Object.keys(result).sort()).toEqual(
      ["consentimiento", "email", "motivo", "nombre", "rol", "telefono"].sort(),
    );
  });
});
