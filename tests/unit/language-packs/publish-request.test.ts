import { describe, expect, it } from "vitest";

import { MAX_NOTE_LENGTH } from "@/lib/language-packs/pack-file";
import {
  readPublishRequest,
  readRestoreRequest,
  restoreNote,
} from "@/lib/language-packs/publish-request";

import { testItem, testPack, testTheme } from "./fixtures";

const BUCKET = "https://proyecto.supabase.co/storage/v1/object/public/audio/";

const body = (overrides: Record<string, unknown> = {}) => ({
  pack: testPack(),
  expectedVersion: 1,
  note: "Revisado por PRUEBA",
  ...overrides,
});

describe("readPublishRequest", () => {
  it("accepts a valid pack with a note, cleaned and trimmed", () => {
    const read = readPublishRequest(
      body({ note: "  Revisado por PRUEBA  " }),
      "ashaninka",
      BUCKET,
    );

    expect(read.ok).toBe(true);
    if (read.ok) {
      expect(read.note).toBe("Revisado por PRUEBA");
      expect(read.expectedVersion).toBe(1);
      expect(read.pack.language.slug).toBe("ashaninka");
    }
  });

  it("accepts «publicar igual» (null) and «nothing yet» (0)", () => {
    expect(
      readPublishRequest(body({ expectedVersion: null }), "ashaninka", BUCKET)
        .ok,
    ).toBe(true);
    expect(
      readPublishRequest(body({ expectedVersion: 0 }), "ashaninka", BUCKET).ok,
    ).toBe(true);
  });

  it("refuses a body without the expected shape", () => {
    expect(readPublishRequest(undefined, "ashaninka", BUCKET)).toMatchObject({
      ok: false,
      error: "invalid_request",
    });
    expect(
      readPublishRequest(body({ expectedVersion: -1 }), "ashaninka", BUCKET),
    ).toMatchObject({ ok: false, error: "invalid_request" });
  });

  // AC-SP6-12
  it("refuses a missing or blank note", () => {
    expect(
      readPublishRequest(body({ note: "   " }), "ashaninka", BUCKET),
    ).toMatchObject({ ok: false, error: "note_required" });
  });

  it("refuses a note that is too long", () => {
    expect(
      readPublishRequest(
        body({ note: "x".repeat(MAX_NOTE_LENGTH + 1) }),
        "ashaninka",
        BUCKET,
      ),
    ).toMatchObject({ ok: false, error: "note_too_long" });
  });

  it("refuses something that is not a pack, with the problems", () => {
    const read = readPublishRequest(
      body({ pack: { schema: "otra" } }),
      "ashaninka",
      BUCKET,
    );

    expect(read).toMatchObject({ ok: false, error: "pack_invalid" });
    if (!read.ok) expect(read.problems?.length).toBeGreaterThan(0);
  });

  // AC-SP6-6: the server validates again, whatever the browser did.
  it("refuses a pack with errors of §4.3, listing them", () => {
    const pack = testPack({
      themes: [
        testTheme({
          items: [
            testItem({ sourceId: "fuente-que-no-existe" }),
            ...testTheme().items.slice(1),
          ],
        }),
      ],
    });

    const read = readPublishRequest(body({ pack }), "ashaninka", BUCKET);

    expect(read).toMatchObject({ ok: false, error: "pack_has_errors" });
    if (!read.ok) {
      expect(read.issues?.map((issue) => issue.code)).toContain(
        "unknown_source",
      );
    }
  });

  it("refuses a pack of another language than the one in the URL", () => {
    const read = readPublishRequest(body(), "uro", BUCKET);

    expect(read).toMatchObject({ ok: false, error: "pack_has_errors" });
  });
});

describe("readRestoreRequest", () => {
  it("accepts a version and the expected one", () => {
    expect(readRestoreRequest({ version: 1, expectedVersion: 3 })).toEqual({
      ok: true,
      version: 1,
      expectedVersion: 3,
    });
  });

  it("refuses version 0 and a missing body", () => {
    expect(readRestoreRequest({ version: 0, expectedVersion: 3 }).ok).toBe(
      false,
    );
    expect(readRestoreRequest(undefined).ok).toBe(false);
  });

  it("leaves a note that says where the version came from", () => {
    expect(restoreNote(2)).toBe("Restaurada desde la versión 2.");
  });
});
